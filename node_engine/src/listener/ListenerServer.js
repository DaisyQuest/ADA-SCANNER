const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { EventEmitter } = require("events");
const { RuntimeScanner } = require("../runtime/RuntimeScanner");
const { ReportBuilder } = require("./ReportBuilder");
const { HtmlReportBuilder } = require("./HtmlReportBuilder");

const DEFAULT_ALLOWED_ORIGINS = ["https://localhost:7203"];

class ListenerServer extends EventEmitter {
  constructor({
    port = 0,
    rulesRoot,
    scanner = new RuntimeScanner(),
    reportBuilder = new ReportBuilder(),
    htmlReportBuilder = new HtmlReportBuilder(),
    uiRoot = path.join(__dirname, "ui"),
    allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
    ignoreSelfCapture = true
  } = {}) {
    super();
    this.port = port;
    this.rulesRoot = rulesRoot;
    this.scanner = scanner;
    this.reportBuilder = reportBuilder;
    this.htmlReportBuilder = htmlReportBuilder;
    this.uiRoot = uiRoot;
    this.allowedOrigins = this.normalizeAllowedOrigins(allowedOrigins);
    this.ignoreSelfCapture = ignoreSelfCapture;
    this.server = null;
    this.documents = [];
    this.issues = [];
    this.payloadHashes = new Set();
    this.issueHashes = new Set();
    this.eventClients = new Set();
  }

  start() {
    if (!this.rulesRoot) {
      throw new Error("Rules root is required.");
    }

    if (this.server) {
      return Promise.resolve(this.server.address().port);
    }

    this.server = http.createServer(this.handleRequest.bind(this));
    return new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, () => {
        resolve(this.server.address().port);
      });
    });
  }

  stop() {
    if (!this.server) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        this.server = null;
        resolve();
      });
    });
  }

  // CHANGE: central CORS helper
  addCors(response, request) {
    const allowedOrigin = this.resolveAllowedOrigin(request);
    if (allowedOrigin) {
      response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Max-Age", "86400");
  }

  handleRequest(request, response) {
    const { method, url } = request;
    const requestUrl = this.parseUrl(url);
    const pathname = requestUrl?.pathname ?? url;

    // CHANGE: handle preflight
    if (method === "OPTIONS" && pathname === "/capture") {
      this.addCors(response, request);
      response.statusCode = 204;
      response.end();
      return;
    }

    if (method === "GET" && pathname === "/health") {
      this.writeJson(response, 200, { status: "ok" }, request);
      return;
    }

    if (method === "GET" && pathname === "/") {
      this.writeStaticFile(response, "index.html", "text/html; charset=utf-8");
      return;
    }

    if (method === "GET" && pathname === "/assets/app.js") {
      this.writeStaticFile(response, path.join("assets", "app.js"), "text/javascript; charset=utf-8");
      return;
    }

    if (method === "GET" && pathname === "/assets/app.css") {
      this.writeStaticFile(response, path.join("assets", "app.css"), "text/css; charset=utf-8");
      return;
    }

    if (method === "GET" && pathname === "/events") {
      this.handleEventStream(request, response);
      return;
    }

    if (method === "GET" && pathname === "/documents") {
      this.writeJson(response, 200, { documents: this.documents }, request);
      return;
    }

    if (method === "GET" && pathname === "/issues") {
      this.writeJson(response, 200, { issues: this.issues }, request);
      return;
    }

    if (method === "GET" && pathname === "/report") {
      const report = this.reportBuilder.build({
        documents: this.documents,
        issues: this.issues
      });
      const format = requestUrl?.searchParams.get("format");
      if (format === "html") {
        const html = this.htmlReportBuilder.buildReport({ report });
        this.writeHtml(response, 200, html, request, {
          "Content-Disposition": "attachment; filename=\"report.html\""
        });
        return;
      }
      this.writeJson(response, 200, report, request);
      return;
    }

    if (method === "GET" && pathname === "/report/html") {
      const report = this.reportBuilder.build({
        documents: this.documents,
        issues: this.issues
      });
      const html = this.htmlReportBuilder.buildReport({ report });
      this.writeHtml(response, 200, html, request, {
        "Content-Disposition": "attachment; filename=\"report.html\""
      });
      return;
    }

    if (method === "GET" && pathname === "/report/files") {
      this.writeJson(response, 200, {
        files: this.reportBuilder.buildFileSummaries({
          documents: this.documents,
          issues: this.issues
        })
      }, request);
      return;
    }

    if (method === "GET" && pathname === "/report/file") {
      const filePath = requestUrl?.searchParams.get("path");
      const format = requestUrl?.searchParams.get("format");
      if (!filePath) {
        this.writeJson(response, 400, { error: "Query parameter 'path' is required." }, request);
        return;
      }

      const report = this.reportBuilder.buildFileReport({
        filePath,
        documents: this.documents,
        issues: this.issues
      });

      if (!report.document && report.issueCount === 0) {
        this.writeJson(response, 404, { error: "Report not found for requested file." }, request);
        return;
      }

      if (format === "html") {
        const html = this.htmlReportBuilder.buildFileReport({ report });
        const filename = this.createReportFilename(filePath, "html");
        this.writeHtml(
          response,
          200,
          html,
          request,
          { "Content-Disposition": `attachment; filename="${filename}"` }
        );
      } else {
        const filename = this.createReportFilename(filePath, "json");
        this.writeJson(
          response,
          200,
          report,
          request,
          { "Content-Disposition": `attachment; filename="${filename}"` }
        );
      }
      return;
    }

    if (method === "POST" && pathname === "/capture") {
      if (!this.isOriginAllowed(request)) {
        this.writeJson(response, 403, { error: "Origin not allowed." }, request);
        return;
      }

      this.readBody(request)
          .then((payload) => {
            if (!payload?.url || !payload?.html) {
              this.writeJson(response, 400, { error: "Payload must include url and html." }, request);
              return;
            }

            if (this.ignoreSelfCapture && this.isSelfCapture(payload.url, request)) {
              this.writeJson(response, 200, { ignored: true, reason: "self-capture" }, request);
              return;
            }

            const payloadHash = this.createPayloadHash(payload);
            if (this.payloadHashes.has(payloadHash)) {
              this.writeJson(response, 200, { duplicate: true }, request);
              return;
            }

            const captureMetadata = this.buildCaptureMetadata(payload);
            const result = this.scanner.scanDocument({
              rulesRoot: this.rulesRoot,
              url: payload.url,
              content: payload.html,
              kind: payload.kind ?? "html",
              contentType: payload.contentType ?? "text/html"
            });
            const document = { ...result.document, capture: captureMetadata };

            this.payloadHashes.add(payloadHash);
            this.documents.push(document);
            this.addIssues(result.issues);
            const report = this.reportBuilder.build({
              documents: this.documents,
              issues: this.issues
            });
            const capturePayload = {
              document,
              issues: result.issues,
              report
            };
            this.emit("capture", capturePayload);
            this.broadcastEvent("capture", capturePayload);

            this.writeJson(response, 200, {
              document,
              issues: result.issues,
              report
            }, request);
          })
          .catch((error) => {
            this.writeJson(response, 500, { error: error.message }, request);
          });
      return;
    }

    this.writeJson(response, 404, { error: "Not found." }, request);
  }

  readBody(request) {
    return new Promise((resolve, reject) => {
      let body = "";
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        if (!body.trim()) {
          resolve(null);
          return;
        }

        try {
          const payload = JSON.parse(body);
          resolve(payload);
        } catch (error) {
          reject(error);
        }
      });
      request.on("error", reject);
    });
  }

  writeJson(response, statusCode, payload, request, headers = {}) {
    const json = JSON.stringify(payload);

    // CHANGE: ensure CORS headers are always present
    this.addCors(response, request);

    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
      ...headers
    });
    response.end(json);
  }

  writeHtml(response, statusCode, html, request, headers = {}) {
    const body = String(html ?? "");
    this.addCors(response, request);
    response.writeHead(statusCode, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      ...headers
    });
    response.end(body);
  }

  writeStaticFile(response, relativePath, contentType) {
    try {
      const fullPath = path.join(this.uiRoot, relativePath);
      const file = fs.readFileSync(fullPath);
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": file.length
      });
      response.end(file);
    } catch (error) {
      this.writeJson(response, 404, { error: "Not found." });
    }
  }

  handleEventStream(request, response) {
    this.addCors(response, request);
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    response.write(`event: connected\ndata: ${JSON.stringify({ status: "ok" })}\n\n`);
    this.eventClients.add(response);

    request.on("close", () => {
      this.eventClients.delete(response);
    });
  }

  createPayloadHash(payload) {
    const hash = crypto.createHash("sha256");
    hash.update(String(payload.url ?? ""));
    hash.update("::");
    hash.update(String(payload.kind ?? ""));
    hash.update("::");
    hash.update(String(payload.contentType ?? ""));
    hash.update("::");
    hash.update(String(payload.html ?? ""));
    return hash.digest("hex");
  }

  buildCaptureMetadata(payload) {
    const changeSource = payload?.changeSource ?? payload?.ChangeSource ?? "initial";
    const frameContext = payload?.frameContext ?? payload?.FrameContext ?? null;
    return {
      changeSource,
      frameContext
    };
  }

  createReportFilename(filePath, extension = "json") {
    const sanitized = String(filePath)
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const safeExtension = extension === "html" ? "html" : "json";
    return sanitized ? `report-${sanitized}.${safeExtension}` : `report.${safeExtension}`;
  }

  parseUrl(url) {
    try {
      return new URL(url, "http://localhost");
    } catch (error) {
      return null;
    }
  }

  normalizeAllowedOrigins(allowedOrigins) {
    if (allowedOrigins === "*") {
      return { allowAny: true, exact: new Set(), patterns: [] };
    }

    const list = Array.isArray(allowedOrigins)
      ? allowedOrigins
      : String(allowedOrigins ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const allowAny = list.includes("*");
    const exact = new Set(list.filter((origin) => !origin.includes("*")));
    const patterns = list
      .filter((origin) => origin.includes("*") && origin !== "*")
      .map((origin) => {
        const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        return new RegExp(`^${escaped}$`, "i");
      });

    return { allowAny, exact, patterns };
  }

  resolveAllowedOrigin(request) {
    const origin = request?.headers?.origin;
    if (!origin) {
      if (this.allowedOrigins.allowAny) {
        return "*";
      }

      if (this.allowedOrigins.exact.size === 1) {
        return Array.from(this.allowedOrigins.exact)[0];
      }

      return null;
    }

    if (this.allowedOrigins.allowAny) {
      return origin;
    }

    if (this.allowedOrigins.exact.has(origin)) {
      return origin;
    }

    if (this.allowedOrigins.patterns.some((pattern) => pattern.test(origin))) {
      return origin;
    }

    return null;
  }

  isOriginAllowed(request) {
    if (this.allowedOrigins.allowAny) {
      return true;
    }

    const origin = request?.headers?.origin;
    if (!origin) {
      return true;
    }

    return !!this.resolveAllowedOrigin(request);
  }

  getServerOrigin(request) {
    const host = request?.headers?.host;
    if (!host) {
      return null;
    }

    const proto = request?.connection?.encrypted ? "https" : "http";
    return `${proto}://${host}`;
  }

  isSelfCapture(payloadUrl, request) {
    const origin = this.getServerOrigin(request);
    if (!origin) {
      return false;
    }

    try {
      const parsedPayload = new URL(payloadUrl);
      return parsedPayload.origin === origin;
    } catch (error) {
      return false;
    }
  }

  createIssueKey(issue) {
    return [
      issue.ruleId,
      issue.checkId,
      issue.filePath,
      issue.line,
      issue.message,
      issue.evidence
    ]
        .map((value) => value ?? "")
        .join("::");
  }

  addIssues(issues) {
    for (const issue of issues) {
      const key = this.createIssueKey(issue);
      if (this.issueHashes.has(key)) {
        continue;
      }

      this.issueHashes.add(key);
      this.issues.push(issue);
    }
  }

  broadcastEvent(eventName, payload) {
    const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.eventClients) {
      client.write(data);
    }
  }
}

module.exports = { ListenerServer };
