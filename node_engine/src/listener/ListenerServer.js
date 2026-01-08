const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { EventEmitter } = require("events");
const { RuntimeScanner } = require("../runtime/RuntimeScanner");
const { ReportBuilder } = require("./ReportBuilder");

// CHANGE: configure allowed origin(s)
const ALLOWED_ORIGIN = "https://localhost:7203";

class ListenerServer extends EventEmitter {
  constructor({
    port = 0,
    rulesRoot,
    scanner = new RuntimeScanner(),
    reportBuilder = new ReportBuilder(),
    uiRoot = path.join(__dirname, "ui")
  } = {}) {
    super();
    this.port = port;
    this.rulesRoot = rulesRoot;
    this.scanner = scanner;
    this.reportBuilder = reportBuilder;
    this.uiRoot = uiRoot;
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
  addCors(response) {
    response.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.setHeader("Access-Control-Max-Age", "86400");
  }

  handleRequest(request, response) {
    const { method, url } = request;

    // CHANGE: handle preflight
    if (method === "OPTIONS" && url === "/capture") {
      this.addCors(response);
      response.statusCode = 204;
      response.end();
      return;
    }

    if (method === "GET" && url === "/health") {
      this.writeJson(response, 200, { status: "ok" });
      return;
    }

    if (method === "GET" && url === "/") {
      this.writeStaticFile(response, "index.html", "text/html; charset=utf-8");
      return;
    }

    if (method === "GET" && url === "/assets/app.js") {
      this.writeStaticFile(response, path.join("assets", "app.js"), "text/javascript; charset=utf-8");
      return;
    }

    if (method === "GET" && url === "/assets/app.css") {
      this.writeStaticFile(response, path.join("assets", "app.css"), "text/css; charset=utf-8");
      return;
    }

    if (method === "GET" && url === "/events") {
      this.handleEventStream(request, response);
      return;
    }

    if (method === "GET" && url === "/documents") {
      this.writeJson(response, 200, { documents: this.documents });
      return;
    }

    if (method === "GET" && url === "/issues") {
      this.writeJson(response, 200, { issues: this.issues });
      return;
    }

    if (method === "GET" && url === "/report") {
      this.writeJson(response, 200, this.reportBuilder.build({
        documents: this.documents,
        issues: this.issues
      }));
      return;
    }

    if (method === "POST" && url === "/capture") {
      this.readBody(request)
          .then((payload) => {
            if (!payload?.url || !payload?.html) {
              this.writeJson(response, 400, { error: "Payload must include url and html." });
              return;
            }

            const payloadHash = this.createPayloadHash(payload);
            if (this.payloadHashes.has(payloadHash)) {
              this.writeJson(response, 200, { duplicate: true });
              return;
            }

            const result = this.scanner.scanDocument({
              rulesRoot: this.rulesRoot,
              url: payload.url,
              content: payload.html,
              kind: payload.kind ?? "html",
              contentType: payload.contentType ?? "text/html"
            });

            this.payloadHashes.add(payloadHash);
            this.documents.push(result.document);
            this.addIssues(result.issues);
            const report = this.reportBuilder.build({
              documents: this.documents,
              issues: this.issues
            });
            const capturePayload = {
              document: result.document,
              issues: result.issues,
              report
            };
            this.emit("capture", capturePayload);
            this.broadcastEvent("capture", capturePayload);

            this.writeJson(response, 200, {
              document: result.document,
              issues: result.issues,
              report
            });
          })
          .catch((error) => {
            this.writeJson(response, 500, { error: error.message });
          });
      return;
    }

    this.writeJson(response, 404, { error: "Not found." });
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

  writeJson(response, statusCode, payload) {
    const json = JSON.stringify(payload);

    // CHANGE: ensure CORS headers are always present
    this.addCors(response);

    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json)
    });
    response.end(json);
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
    this.addCors(response);
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
