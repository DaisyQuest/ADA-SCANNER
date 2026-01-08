const http = require("http");
const { EventEmitter } = require("events");
const { RuntimeScanner } = require("../runtime/RuntimeScanner");

class ListenerServer extends EventEmitter {
  constructor({ port = 0, rulesRoot, scanner = new RuntimeScanner() } = {}) {
    super();
    this.port = port;
    this.rulesRoot = rulesRoot;
    this.scanner = scanner;
    this.server = null;
    this.documents = [];
    this.issues = [];
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

  handleRequest(request, response) {
    const { method, url } = request;
    if (method === "GET" && url === "/health") {
      this.writeJson(response, 200, { status: "ok" });
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

    if (method === "POST" && url === "/capture") {
      this.readBody(request)
        .then((payload) => {
          if (!payload?.url || !payload?.html) {
            this.writeJson(response, 400, { error: "Payload must include url and html." });
            return;
          }

          const result = this.scanner.scanDocument({
            rulesRoot: this.rulesRoot,
            url: payload.url,
            content: payload.html,
            kind: payload.kind ?? "html",
            contentType: payload.contentType ?? "text/html"
          });

          this.documents.push(result.document);
          this.issues.push(...result.issues);
          this.emit("capture", result);

          this.writeJson(response, 200, {
            document: result.document,
            issues: result.issues
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
    response.writeHead(statusCode, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(json)
    });
    response.end(json);
  }
}

module.exports = { ListenerServer };
