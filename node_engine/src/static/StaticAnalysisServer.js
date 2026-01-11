const http = require("http");
const path = require("path");
const fs = require("fs");
const { HtmlReportBuilder } = require("../listener/HtmlReportBuilder");
const { buildCsvReport, buildExcelReport } = require("../listener/ReportExporter");
const { StaticReportBuilder } = require("./StaticReportBuilder");

class StaticAnalysisServer {
  constructor({
    port = 0,
    documents = [],
    issues = [],
    rules = [],
    reportBuilder = new StaticReportBuilder(),
    htmlReportBuilder = new HtmlReportBuilder(),
    uiRoot = path.join(__dirname, "ui")
  } = {}) {
    this.port = port;
    this.documents = documents;
    this.issues = issues;
    this.rules = rules;
    this.reportBuilder = reportBuilder;
    this.htmlReportBuilder = htmlReportBuilder;
    this.uiRoot = uiRoot;
    this.server = null;
  }

  start() {
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

  handleRequest(request, response) {
    const { method, url } = request;
    const requestUrl = this.parseUrl(url);
    const pathname = requestUrl?.pathname ?? url;

    if (method === "GET" && pathname === "/health") {
      this.writeJson(response, 200, { status: "ok" });
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

    if (method === "GET" && pathname === "/documents") {
      this.writeJson(response, 200, { documents: this.documents });
      return;
    }

    if (method === "GET" && pathname === "/issues") {
      this.writeJson(response, 200, { issues: this.issues });
      return;
    }

    if (method === "GET" && pathname === "/report") {
      const report = this.reportBuilder.build({
        documents: this.documents,
        issues: this.issues,
        rules: this.rules
      });
      const format = requestUrl?.searchParams.get("format");
      const inline = requestUrl?.searchParams.get("inline") === "1";
      if (format === "html") {
        const html = this.htmlReportBuilder.buildReport({ report });
        const headers = inline ? {} : { "Content-Disposition": "attachment; filename=\"report.html\"" };
        this.writeHtml(response, 200, html, headers);
        return;
      }
      if (format === "csv") {
        const csv = buildCsvReport({ issues: this.issues, includeAlgorithm: true });
        this.writeCsv(response, 200, csv, { "Content-Disposition": "attachment; filename=\"report.csv\"" });
        return;
      }
      if (format === "excel" || format === "excel-thin") {
        const includeAlgorithm = format === "excel";
        this.writeExcel(response, {
          issues: this.issues,
          includeAlgorithm,
          filename: includeAlgorithm ? "report.xlsx" : "report-thin.xlsx"
        });
        return;
      }
      this.writeJson(response, 200, report);
      return;
    }

    if (method === "GET" && pathname === "/report/html") {
      const report = this.reportBuilder.build({
        documents: this.documents,
        issues: this.issues,
        rules: this.rules
      });
      const html = this.htmlReportBuilder.buildReport({ report });
      this.writeHtml(response, 200, html, { "Content-Disposition": "attachment; filename=\"report.html\"" });
      return;
    }

    if (method === "GET" && pathname === "/report/files") {
      this.writeJson(response, 200, {
        files: this.reportBuilder.buildFileSummaries({
          documents: this.documents,
          issues: this.issues,
          rules: this.rules
        })
      });
      return;
    }

    if (method === "GET" && pathname === "/report/file") {
      const filePath = requestUrl?.searchParams.get("path");
      const format = requestUrl?.searchParams.get("format");
      const inline = requestUrl?.searchParams.get("inline") === "1";
      if (!filePath) {
        this.writeJson(response, 400, { error: "Query parameter 'path' is required." });
        return;
      }

      const report = this.reportBuilder.buildFileReport({
        filePath,
        documents: this.documents,
        issues: this.issues
      });

      if (!report.document && report.issueCount === 0) {
        this.writeJson(response, 404, { error: "Report not found for requested file." });
        return;
      }

      if (format === "html") {
        const html = this.htmlReportBuilder.buildFileReport({ report });
        const filename = this.createReportFilename(filePath, "html");
        const headers = inline
          ? {}
          : { "Content-Disposition": `attachment; filename="${filename}"` };
        this.writeHtml(
          response,
          200,
          html,
          headers
        );
      } else {
        const filename = this.createReportFilename(filePath, "json");
        this.writeJson(
          response,
          200,
          report,
          { "Content-Disposition": `attachment; filename="${filename}"` }
        );
      }
      return;
    }

    this.writeJson(response, 404, { error: "Not found." });
  }

  writeJson(response, statusCode, payload, headers = {}) {
    const json = JSON.stringify(payload);
    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json),
      ...headers
    });
    response.end(json);
  }

  writeHtml(response, statusCode, html, headers = {}) {
    const body = String(html ?? "");
    response.writeHead(statusCode, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      ...headers
    });
    response.end(body);
  }

  writeCsv(response, statusCode, csv, headers = {}) {
    const body = String(csv ?? "");
    response.writeHead(statusCode, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      ...headers
    });
    response.end(body);
  }

  writeExcel(response, { issues, includeAlgorithm, filename }) {
    buildExcelReport({ issues, includeAlgorithm })
      .then((buffer) => {
        const payload = Buffer.from(buffer);
        response.writeHead(200, {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Length": payload.length,
          "Content-Disposition": `attachment; filename=\"${filename}\"`
        });
        response.end(payload);
      })
      .catch(() => {
        this.writeJson(response, 500, { error: "Failed to build Excel export." });
      });
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

  parseUrl(url) {
    try {
      return new URL(url, "http://localhost");
    } catch (error) {
      return null;
    }
  }

  createReportFilename(filePath, extension = "json") {
    const sanitized = String(filePath)
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const safeExtension = extension === "html" ? "html" : "json";
    return sanitized ? `report-${sanitized}.${safeExtension}` : `report.${safeExtension}`;
  }
}

module.exports = { StaticAnalysisServer };
