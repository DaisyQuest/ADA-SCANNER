const fs = require("fs");
const path = require("path");
const os = require("os");
const { ListenerServer } = require("../src/listener/ListenerServer");
const { EventEmitter } = require("events");

const createTempRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-listener-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify({
      id: "rule-1",
      description: "desc",
      severity: "low",
      checkId: "missing-label",
      appliesTo: "html"
    })
  );
  return root;
};

const postJson = async (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

describe("ListenerServer", () => {
  test("handles capture lifecycle", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const baseUrl = `http://localhost:${port}`;

    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);

    const badPayload = await postJson(`${baseUrl}/capture`, { url: "http://example" });
    expect(badPayload.status).toBe(400);

    const preflight = await fetch(`${baseUrl}/capture`, { method: "OPTIONS" });
    expect(preflight.status).toBe(204);

    const capture = await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />",
      kind: "html"
    });
    expect(capture.status).toBe(200);

    const duplicate = await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />",
      kind: "html"
    });
    const duplicatePayload = await duplicate.json();
    expect(duplicatePayload.duplicate).toBe(true);

    const documents = await fetch(`${baseUrl}/documents`);
    const documentsPayload = await documents.json();
    expect(documentsPayload.documents).toHaveLength(1);

    const issues = await fetch(`${baseUrl}/issues`);
    const issuesPayload = await issues.json();
    expect(issuesPayload.issues).toHaveLength(1);

    const report = await fetch(`${baseUrl}/report`);
    const reportPayload = await report.json();
    expect(reportPayload.summary.issues).toBe(1);
    expect(reportPayload.byRule).toHaveLength(1);
    expect(reportPayload.summary.files).toBe(1);

    const fileIndex = await fetch(`${baseUrl}/report/files`);
    const fileIndexPayload = await fileIndex.json();
    expect(fileIndexPayload.files).toHaveLength(1);

    const fileReport = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("http://example")}`);
    const fileReportPayload = await fileReport.json();
    expect(fileReportPayload.filePath).toBe("http://example");
    expect(fileReport.headers.get("content-disposition")).toContain("report-");

    const home = await fetch(`${baseUrl}/`);
    expect(home.status).toBe(200);

    const assets = await fetch(`${baseUrl}/assets/app.js`);
    expect(assets.status).toBe(200);

    const styles = await fetch(`${baseUrl}/assets/app.css`);
    expect(styles.status).toBe(200);

    const notFound = await fetch(`${baseUrl}/missing`);
    expect(notFound.status).toBe(404);

    await server.stop();
  });

  test("deduplicates issues across payloads", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const baseUrl = `http://localhost:${port}`;

    const captureA = await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />",
      kind: "html"
    });
    expect(captureA.status).toBe(200);

    const captureB = await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />\n",
      kind: "html"
    });
    expect(captureB.status).toBe(200);

    const issues = await fetch(`${baseUrl}/issues`);
    const issuesPayload = await issues.json();
    expect(issuesPayload.issues).toHaveLength(1);

    await server.stop();
  });

  test("returns server error on invalid JSON", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });

    expect(response.status).toBe(500);
    await server.stop();
  });

  test("throws when rules root missing", () => {
    const server = new ListenerServer();
    expect(() => server.start()).toThrow("Rules root is required.");
  });

  test("handles empty payload and stop errors", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/capture`, { method: "POST" });
    expect(response.status).toBe(400);

    const badServer = new ListenerServer({ rulesRoot });
    badServer.server = { close: (callback) => callback(new Error("fail")) };
    await expect(badServer.stop()).rejects.toThrow("fail");

    await server.stop();
  });

  test("returns errors for missing or unknown file reports", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/report/file`);
    expect(response.status).toBe(400);

    const missing = await fetch(`http://localhost:${port}/report/file?path=${encodeURIComponent("nope")}`);
    expect(missing.status).toBe(404);

    await server.stop();
  });

  test("returns not found when UI assets missing", async () => {
    const rulesRoot = createTempRules();
    const missingUiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ada-ui-missing-"));
    const server = new ListenerServer({ rulesRoot, uiRoot: missingUiRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(404);

    await server.stop();
  });

  test("streams capture events over SSE", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const request = new EventEmitter();
    const writes = [];
    const response = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      write: jest.fn((chunk) => writes.push(chunk))
    };

    server.handleEventStream(request, response);
    server.broadcastEvent("capture", { issues: [{ ruleId: "rule-1" }] });

    expect(writes.join("")).toContain("event: capture");
    expect(writes.join("")).toContain("issues");
  });

  test("cleans up event streams and handles invalid URLs", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const request = new EventEmitter();
    const response = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      write: jest.fn()
    };

    server.handleEventStream(request, response);
    expect(server.eventClients.size).toBe(1);
    request.emit("close");
    expect(server.eventClients.size).toBe(0);

    expect(server.parseUrl("http://[invalid")).toBeNull();
  });

  test("handles /events requests directly", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const request = new EventEmitter();
    request.method = "GET";
    request.url = "/events";
    const response = {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      write: jest.fn()
    };

    server.handleRequest(request, response);
    expect(response.writeHead).toHaveBeenCalled();
    request.emit("close");
    expect(server.eventClients.size).toBe(0);
  });

  test("builds payload hashes and issue keys", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const hash = server.createPayloadHash({});
    expect(hash).toHaveLength(64);

    const key = server.createIssueKey({});
    expect(key).toContain("::");
  });
});
