const fs = require("fs");
const path = require("path");
const os = require("os");
const ExcelJS = require("exceljs");
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
      appliesTo: "html",
      algorithm: "Set aria-label for inputs.",
      algorithm_advanced: "Review each input and apply aria-label or label."
    })
  );
  return root;
};

const createTempRulesWithRules = (rules) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-listener-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  rules.forEach((rule, index) => {
    fs.writeFileSync(
      path.join(teamDir, `rule-${index}.json`),
      JSON.stringify(rule)
    );
  });
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

    const health = await fetch(`${baseUrl}/health`, {
      headers: { Origin: "https://localhost:7203" }
    });
    expect(health.status).toBe(200);
    expect(health.headers.get("access-control-allow-origin")).toBe("https://localhost:7203");

    const badPayload = await postJson(`${baseUrl}/capture`, { url: "http://example" });
    expect(badPayload.status).toBe(400);

    const preflight = await fetch(`${baseUrl}/capture`, { method: "OPTIONS" });
    expect(preflight.status).toBe(204);

    const capture = await postJson(`${baseUrl}/capture`, {
      url: "http://example",
      html: "<input />",
      kind: "html",
      changeSource: "initial",
      frameContext: { isTopFrame: true }
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
    expect(documentsPayload.documents[0].capture).toEqual({
      changeSource: "initial",
      frameContext: { isTopFrame: true }
    });

    const issues = await fetch(`${baseUrl}/issues`);
    const issuesPayload = await issues.json();
    expect(issuesPayload.issues).toHaveLength(1);

    const report = await fetch(`${baseUrl}/report`);
    const reportPayload = await report.json();
    expect(reportPayload.summary.issues).toBe(1);
    expect(reportPayload.byRule).toHaveLength(1);
    expect(reportPayload.summary.files).toBe(1);

    const reportHtml = await fetch(`${baseUrl}/report?format=html`);
    const reportHtmlBody = await reportHtml.text();
    expect(reportHtml.headers.get("content-type")).toContain("text/html");
    expect(reportHtml.headers.get("content-disposition")).toContain("report.html");
    expect(reportHtmlBody).toContain("Runtime Accessibility Report");

    const reportCsv = await fetch(`${baseUrl}/report?format=csv`);
    const reportCsvBody = await reportCsv.text();
    expect(reportCsv.headers.get("content-type")).toContain("text/csv");
    expect(reportCsv.headers.get("content-disposition")).toContain("report.csv");
    expect(reportCsvBody).toContain("Rule ID");
    expect(reportCsvBody).toContain("Algorithm");

    const reportExcel = await fetch(`${baseUrl}/report?format=excel`);
    const reportExcelBuffer = Buffer.from(await reportExcel.arrayBuffer());
    const excelWorkbook = new ExcelJS.Workbook();
    await excelWorkbook.xlsx.load(reportExcelBuffer);
    const excelSheet = excelWorkbook.getWorksheet("Issues");
    expect(excelSheet).toBeTruthy();
    expect(excelSheet.getRow(1).values).toContain("Algorithm");

    const reportExcelThin = await fetch(`${baseUrl}/report?format=excel-thin`);
    const reportExcelThinBuffer = Buffer.from(await reportExcelThin.arrayBuffer());
    const thinWorkbook = new ExcelJS.Workbook();
    await thinWorkbook.xlsx.load(reportExcelThinBuffer);
    const thinSheet = thinWorkbook.getWorksheet("Issues");
    expect(thinSheet.getRow(1).values).not.toContain("Algorithm");

    const reportHtmlShortcut = await fetch(`${baseUrl}/report/html`);
    const reportHtmlShortcutBody = await reportHtmlShortcut.text();
    expect(reportHtmlShortcut.status).toBe(200);
    expect(reportHtmlShortcutBody).toContain("Runtime Accessibility Report");

    const fileIndex = await fetch(`${baseUrl}/report/files`);
    const fileIndexPayload = await fileIndex.json();
    expect(fileIndexPayload.files).toHaveLength(1);

    const fileReport = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("http://example")}`);
    const fileReportPayload = await fileReport.json();
    expect(fileReportPayload.filePath).toBe("http://example");
    expect(fileReport.headers.get("content-disposition")).toContain("report-");

    const fileReportHtml = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("http://example")}&format=html`);
    const fileReportHtmlBody = await fileReportHtml.text();
    expect(fileReportHtml.headers.get("content-type")).toContain("text/html");
    expect(fileReportHtml.headers.get("content-disposition")).toContain(".html");
    expect(fileReportHtmlBody).toContain("File Accessibility Report");

    const fileReportInline = await fetch(
      `${baseUrl}/report/file?path=${encodeURIComponent("http://example")}&format=html&inline=1`
    );
    expect(fileReportInline.headers.get("content-disposition")).toBeNull();

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

  test("enforces allowed origins and ignores self capture", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["http://allowed.test"] });
    const port = await server.start();
    const baseUrl = `http://localhost:${port}`;

    const denied = await fetch(`${baseUrl}/capture`, {
      method: "POST",
      headers: {
        Origin: "http://denied.test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: "http://example", html: "<input />", kind: "html" })
    });
    expect(denied.status).toBe(403);

    const allowed = await fetch(`${baseUrl}/capture`, {
      method: "POST",
      headers: {
        Origin: "http://allowed.test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: "http://example", html: "<input />", kind: "html" })
    });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("access-control-allow-origin")).toBe("http://allowed.test");

    const selfCapture = await fetch(`${baseUrl}/capture`, {
      method: "POST",
      headers: {
        Origin: "http://allowed.test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: baseUrl, html: "<input />", kind: "html" })
    });
    const selfPayload = await selfCapture.json();
    expect(selfPayload.ignored).toBe(true);

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

  test("handles evaluate endpoints and metadata fallbacks", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();
    const baseUrl = `http://localhost:${port}`;

    const missingContent = await postJson(`${baseUrl}/evaluate`, {});
    expect(missingContent.status).toBe(400);

    const evaluated = await postJson(`${baseUrl}/evaluate`, {
      content: "<input />",
      kind: "html",
      ChangeSource: "manual",
      FrameContext: { isTopFrame: false }
    });
    const evaluatedPayload = await evaluated.json();
    expect(evaluatedPayload.document.capture.changeSource).toBe("evaluator");
    expect(evaluatedPayload.document.capture.frameContext).toBeNull();

    const freemarker = await postJson(`${baseUrl}/evaluate/freemarker`, { content: "<input />" });
    const freemarkerPayload = await freemarker.json();
    expect(freemarker.status).toBe(200);
    expect(freemarkerPayload.document.url).toContain("evaluator://ftl/");

    const captureWithLegacyKeys = await postJson(`${baseUrl}/capture`, {
      url: "http://example-legacy",
      html: "<input />",
      kind: "html",
      ChangeSource: "legacy",
      FrameContext: { isTopFrame: false }
    });
    const capturePayload = await captureWithLegacyKeys.json();
    expect(capturePayload.document.capture.changeSource).toBe("legacy");
    expect(capturePayload.document.capture.frameContext).toEqual({ isTopFrame: false });

    await server.stop();
  });

  test("returns errors for evaluate origin and invalid JSON payloads", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["http://allowed.test"] });
    const port = await server.start();
    const baseUrl = `http://localhost:${port}`;

    const denied = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: {
        Origin: "http://denied.test",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: "<input />" })
    });
    expect(denied.status).toBe(403);

    const invalid = await fetch(`${baseUrl}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    expect(invalid.status).toBe(500);

    await server.stop();
  });

  test("covers helper branches for filenames and origins", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });

    expect(server.createReportFilename("", "html")).toBe("report.html");
    expect(server.createReportFilename("file-a", "json")).toBe("report-file-a.json");

    const normalized = server.normalizeAllowedOrigins(["http://one.test"]);
    expect(normalized.exact.has("http://one.test")).toBe(true);
    const normalizedFromString = server.normalizeAllowedOrigins("http://two.test, http://three.test");
    expect(normalizedFromString.exact.has("http://two.test")).toBe(true);
    const allowAny = server.normalizeAllowedOrigins("*");
    expect(allowAny.allowAny).toBe(true);

    const secureOrigin = server.getServerOrigin({
      headers: { host: "secure.test" },
      connection: { encrypted: true }
    });
    expect(secureOrigin).toBe("https://secure.test");
  });

  test("writes html and csv responses when payloads are null", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const request = { headers: {} };

    const htmlResponse = { setHeader: jest.fn(), writeHead: jest.fn(), end: jest.fn() };
    server.writeHtml(htmlResponse, 200, null, request);
    expect(htmlResponse.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "Content-Type": "text/html; charset=utf-8" })
    );

    const csvResponse = { setHeader: jest.fn(), writeHead: jest.fn(), end: jest.fn() };
    server.writeCsv(csvResponse, 200, null, request);
    expect(csvResponse.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ "Content-Type": "text/csv; charset=utf-8" })
    );
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

    const metadata = server.buildCaptureMetadata({});
    expect(metadata).toEqual({ changeSource: "initial", frameContext: null });
    const pascalMetadata = server.buildCaptureMetadata({ ChangeSource: "mutation", FrameContext: { frameName: "frame" } });
    expect(pascalMetadata).toEqual({ changeSource: "mutation", frameContext: { frameName: "frame" } });
  });

  test("matches wildcard origins and allows any when configured", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["https://*.example.com"] });
    const allowedRequest = { headers: { origin: "https://app.example.com" } };
    const deniedRequest = { headers: { origin: "https://example.com" } };
    expect(server.resolveAllowedOrigin(allowedRequest)).toBe("https://app.example.com");
    expect(server.resolveAllowedOrigin(deniedRequest)).toBeNull();

    const allowAnyServer = new ListenerServer({ rulesRoot, allowedOrigins: "*" });
    expect(allowAnyServer.resolveAllowedOrigin({ headers: {} })).toBe("*");
    expect(allowAnyServer.isOriginAllowed({ headers: { origin: "https://anywhere.test" } })).toBe(true);
  });

  test("resolves default origin when single explicit origin and no header", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["https://only.test"] });
    expect(server.resolveAllowedOrigin({ headers: {} })).toBe("https://only.test");
  });

  test("normalizes comma-delimited allowed origins", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: "http://one, http://two" });
    expect(server.allowedOrigins.exact.has("http://one")).toBe(true);
    expect(server.allowedOrigins.exact.has("http://two")).toBe(true);
    expect(server.resolveAllowedOrigin({ headers: {} })).toBeNull();
    expect(server.resolveAllowedOrigin({ headers: { origin: "http://one" } })).toBe("http://one");
  });

  test("allows requests without origin for multiple allowed origins", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["http://one", "http://two"] });
    expect(server.isOriginAllowed({ headers: {} })).toBe(true);
  });

  test("skips allow-origin header when no origin is resolved", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot, allowedOrigins: ["http://one", "http://two"] });
    const response = { setHeader: jest.fn() };
    server.addCors(response, { headers: {} });
    expect(response.setHeader).not.toHaveBeenCalledWith("Access-Control-Allow-Origin", expect.anything());
    expect(response.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  });

  test("handles self-capture checks without host or invalid URLs", () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });

    expect(server.getServerOrigin({ headers: {} })).toBeNull();
    expect(server.isSelfCapture("http://example", { headers: {} })).toBe(false);
    expect(server.isSelfCapture("not a url", { headers: { host: "localhost" } })).toBe(false);
  });

  test("evaluates pasted snippets for supported kinds", async () => {
    const rulesRoot = createTempRulesWithRules([
      {
        id: "rule-html",
        description: "desc",
        severity: "low",
        checkId: "missing-label",
        appliesTo: "html"
      },
      {
        id: "rule-css",
        description: "desc",
        severity: "low",
        checkId: "focus-visible",
        appliesTo: "css"
      },
      {
        id: "rule-ftl",
        description: "desc",
        severity: "low",
        checkId: "missing-label",
        appliesTo: "ftl"
      }
    ]);
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();
    const baseUrl = `http://localhost:${port}`;

    const htmlEval = await postJson(`${baseUrl}/evaluate`, {
      content: "<input />",
      kind: "html"
    });
    const htmlPayload = await htmlEval.json();
    expect(htmlPayload.issues).toHaveLength(1);

    const cssEval = await postJson(`${baseUrl}/evaluate`, {
      content: "a:focus{outline:none}",
      kind: "css"
    });
    const cssPayload = await cssEval.json();
    expect(cssPayload.issues).toHaveLength(1);

    const ftlEval = await postJson(`${baseUrl}/evaluate/freemarker`, {
      content: "<input />"
    });
    const ftlPayload = await ftlEval.json();
    expect(ftlPayload.issues).toHaveLength(2);
    expect(ftlPayload.issues.map((issue) => issue.ruleId).sort()).toEqual(["rule-ftl", "rule-html"]);

    await server.stop();
  });
});
