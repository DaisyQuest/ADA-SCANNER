const fs = require("fs");
const path = require("path");
const os = require("os");
const { ListenerServer } = require("../src/listener/ListenerServer");

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

const readEvent = (url, eventName) =>
  new Promise((resolve, reject) => {
    const http = require("http");
    const request = http.get(url, (response) => {
      let data = "";
      response.on("data", (chunk) => {
        data += chunk.toString();
        if (data.includes(`event: ${eventName}`)) {
          response.destroy();
          resolve(data);
        }
      });
    });

    request.on("error", reject);
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

    const home = await fetch(`${baseUrl}/`);
    expect(home.status).toBe(200);

    const assets = await fetch(`${baseUrl}/assets/app.js`);
    expect(assets.status).toBe(200);

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

  test("returns not found when UI assets missing", async () => {
    const rulesRoot = createTempRules();
    const missingUiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ada-ui-missing-"));
    const server = new ListenerServer({ rulesRoot, uiRoot: missingUiRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(404);

    await server.stop();
  });

  test("streams capture events over SSE", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const baseUrl = `http://localhost:${port}`;
    const eventPromise = readEvent(`${baseUrl}/events`, "capture");

    await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />",
      kind: "html"
    });

    const data = await eventPromise;
    expect(data).toContain("event: capture");
    expect(data).toContain("issues");

    await server.stop();
  });
});
