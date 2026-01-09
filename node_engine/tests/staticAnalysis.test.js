const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  StaticAnalyzer,
  collectFiles,
  DEFAULT_EXTENSIONS,
  DEFAULT_IGNORED_DIRS
} = require("../src/static/StaticAnalyzer");
const { StaticAnalysisServer } = require("../src/static/StaticAnalysisServer");
const { StaticReportBuilder } = require("../src/static/StaticReportBuilder");
const { resolveStaticOptions, startStaticAnalysis, runCli } = require("../src/static/cli");

const createTempRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-rules-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify({
      id: "rule-1",
      description: "desc",
      severity: "low",
      checkId: "insufficient-contrast",
      appliesTo: "html"
    })
  );
  return root;
};

const createTempProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-project-"));
  fs.writeFileSync(path.join(root, "index.html"), '<div style="color:#777;background-color:#888"></div>');
  fs.writeFileSync(path.join(root, "view.cshtml"), "<div></div>");
  fs.writeFileSync(path.join(root, "page.razor"), "<div></div>");
  fs.writeFileSync(path.join(root, "dialog.xaml"), "<Grid></Grid>");
  fs.writeFileSync(path.join(root, "template.ftl"), '<div style="color:#000;background-color:#fff"></div>');
  fs.writeFileSync(path.join(root, "styles.css"), ".a { color: #000; background-color: #fff; }");
  fs.writeFileSync(path.join(root, "script.js"), "console.log('hi');");
  fs.writeFileSync(path.join(root, "Main.java"), "class Main {}");
  fs.writeFileSync(path.join(root, "Program.cs"), "class Program {}");
  return root;
};

describe("StaticAnalyzer", () => {
  test("scans supported file types and reports issues", () => {
    const rulesRoot = createTempRules();
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer();

    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot });
    const filePaths = result.documents.map((doc) => doc.url).sort();

    expect(filePaths).toEqual([
      "Main.java",
      "Program.cs",
      "dialog.xaml",
      "index.html",
      "page.razor",
      "script.js",
      "styles.css",
      "template.ftl",
      "view.cshtml"
    ]);
    expect(result.documents.find((doc) => doc.url === "template.ftl").kind).toBe("ftl");
    expect(result.documents.find((doc) => doc.url === "view.cshtml").kind).toBe("cshtml");
    expect(result.documents.find((doc) => doc.url === "page.razor").kind).toBe("razor");
    expect(result.documents.find((doc) => doc.url === "dialog.xaml").kind).toBe("xaml");
    expect(result.issues).toHaveLength(1);
  });

  test("records linked stylesheets on HTML documents", () => {
    const rulesRoot = createTempRules();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-links-"));
    fs.writeFileSync(path.join(root, "index.html"), "<link rel=\"stylesheet\" href=\"styles.css\" />");
    fs.writeFileSync(path.join(root, "styles.css"), ".a { color: #000; }");
    const analyzer = new StaticAnalyzer();

    const result = analyzer.scanRoot({ rootDir: root, rulesRoot });
    const document = result.documents.find((doc) => doc.url === "index.html");

    expect(document.stylesheets).toEqual(["styles.css"]);
  });

  test("throws when root or rules are missing", () => {
    const analyzer = new StaticAnalyzer();
    expect(() => analyzer.scanRoot({ rootDir: "", rulesRoot: "/rules" })).toThrow("Root directory is required.");
    expect(() => analyzer.scanRoot({ rootDir: "/tmp", rulesRoot: "" })).toThrow("Rules root is required.");
  });

  test("throws when rule validation fails", () => {
    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({
          isValid: false,
          errors: [{ team: "team", ruleId: "rule-1", message: "bad" }]
        })
      }
    });

    expect(() => analyzer.scanRoot({ rootDir: "/tmp", rulesRoot: "/rules" }))
      .toThrow("Rule validation failed. team/rule-1: bad");
  });

  test("skips unknown checks and appliesTo mismatches", () => {
    const rulesRoot = createTempRules();
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({
          isValid: true,
          teams: [
            {
              teamName: "team",
              rules: [
                { id: "rule-1", checkId: "missing", appliesTo: "html" },
                { id: "rule-2", checkId: "insufficient-contrast", appliesTo: "css" },
                { id: "rule-3", checkId: "other-check", appliesTo: "html" }
              ]
            }
          ]
        })
      },
      checkRegistry: {
        find: (checkId) => {
          if (checkId === "insufficient-contrast") {
            return {
              applicableKinds: ["html"],
              run: () => [{ ruleId: "rule-2", checkId: "insufficient-contrast", filePath: "index.html" }]
            };
          }
          if (checkId === "other-check") {
            return {
              applicableKinds: ["css"],
              run: () => [{ ruleId: "rule-3", checkId: "other-check", filePath: "styles.css" }]
            };
          }
          return null;
        }
      }
    });

    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot });
    expect(result.issues).toHaveLength(0);
  });

  test("records issues when appliesTo matches and deduplicates", () => {
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({
          isValid: true,
          teams: [
            {
              teamName: "team",
              rules: [
                {
                  id: "rule-1",
                  checkId: "insufficient-contrast",
                  appliesTo: "html",
                  description: "desc",
                  severity: "high",
                  recommendation: "fix",
                  wcagCriteria: ["1.4.3"],
                  problemTags: ["contrast"]
                }
              ]
            }
          ]
        })
      },
      checkRegistry: {
        find: () => ({
          applicableKinds: ["html"],
          run: () => [
            { ruleId: "rule-1", checkId: "insufficient-contrast", filePath: "index.html", message: "Issue" },
            { ruleId: "rule-1", checkId: "insufficient-contrast", filePath: "index.html", message: "Issue" }
          ]
        })
      }
    });

    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot: "/rules" });
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe("high");
    expect(result.issues[0].recommendation).toBe("fix");
  });

  test("collectFiles respects ignored directories", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-ignore-"));
    const ignored = path.join(root, "node_modules");
    const nested = path.join(root, "src");
    fs.mkdirSync(ignored, { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(ignored, "skip.html"), "<div></div>");
    fs.writeFileSync(path.join(nested, "nested.html"), "<div></div>");
    fs.writeFileSync(path.join(root, "keep.html"), "<div></div>");
    fs.writeFileSync(path.join(root, "ignore.txt"), "nope");

    const files = collectFiles(root, DEFAULT_EXTENSIONS, DEFAULT_IGNORED_DIRS);
    expect(files.map((file) => path.basename(file)).sort()).toEqual(["keep.html", "nested.html"]);
  });

  test("skips files when extension entry is missing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-ext-"));
    fs.writeFileSync(path.join(root, "file.fake"), "<div></div>");
    const extensionMap = {
      has: () => true,
      get: () => null
    };

    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({ isValid: true, teams: [] })
      },
      extensionMap
    });

    const result = analyzer.scanRoot({ rootDir: root, rulesRoot: "/rules" });
    expect(result.documents).toHaveLength(0);
  });

  test("records issues when appliesTo is omitted", () => {
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({
          isValid: true,
          teams: [
            {
              teamName: "team",
              rules: [{ id: "rule-1", checkId: "check-no-applies" }]
            }
          ]
        })
      },
      checkRegistry: {
        find: () => ({
          applicableKinds: ["html"],
          run: () => [{ ruleId: "rule-1", checkId: "check-no-applies", filePath: "index.html", message: "Issue" }]
        })
      }
    });

    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot: "/rules" });
    expect(result.issues[0].ruleDescription).toBe("");
    expect(result.issues[0].severity).toBe("");
  });

  test("supports appliesTo matching sourceKind variants", () => {
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer({
      ruleLoader: {
        validateRules: () => ({
          isValid: true,
          teams: [
            {
              teamName: "team",
              rules: [
                { id: "rule-1", checkId: "html-check", appliesTo: "ftl" },
                { id: "rule-2", checkId: "html-check", appliesTo: "html" }
              ]
            }
          ]
        })
      },
      checkRegistry: {
        find: () => ({
          applicableKinds: ["html"],
          run: (context, rule) => [
            { ruleId: rule.id, checkId: "html-check", filePath: context.filePath, message: "Issue" }
          ]
        })
      }
    });

    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot: "/rules" });
    const ftlIssues = result.issues.filter((issue) => issue.filePath === "template.ftl");
    const htmlIssues = result.issues.filter((issue) => issue.filePath === "index.html");

    expect(ftlIssues.map((issue) => issue.ruleId).sort()).toEqual(["rule-1", "rule-2"]);
    expect(htmlIssues.map((issue) => issue.ruleId)).toEqual(["rule-2"]);
  });
});

describe("StaticAnalysisServer", () => {
  test("serves report and file endpoints", async () => {
    const rulesRoot = createTempRules();
    const projectRoot = createTempProject();
    const analyzer = new StaticAnalyzer();
    const result = analyzer.scanRoot({ rootDir: projectRoot, rulesRoot });

    const server = new StaticAnalysisServer({
      documents: result.documents,
      issues: result.issues
    });
    const port = await server.start();

    const baseUrl = `http://localhost:${port}`;
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);

    const report = await fetch(`${baseUrl}/report`);
    const reportPayload = await report.json();
    expect(reportPayload.summary.files).toBe(result.documents.length);

    const documents = await fetch(`${baseUrl}/documents`);
    const documentsPayload = await documents.json();
    expect(documentsPayload.documents).toHaveLength(result.documents.length);

    const issues = await fetch(`${baseUrl}/issues`);
    const issuesPayload = await issues.json();
    expect(issuesPayload.issues).toHaveLength(result.issues.length);

    const fileIndex = await fetch(`${baseUrl}/report/files`);
    const fileIndexPayload = await fileIndex.json();
    expect(fileIndexPayload.files.length).toBeGreaterThan(0);

    const fileReport = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("index.html")}`);
    const fileReportPayload = await fileReport.json();
    expect(fileReportPayload.filePath).toBe("index.html");

    const fileReportHtml = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("index.html")}&format=html`);
    expect(fileReportHtml.headers.get("content-disposition")).toContain(".html");

    const reportHtml = await fetch(`${baseUrl}/report?format=html`);
    expect(reportHtml.headers.get("content-type")).toContain("text/html");

    const reportHtmlShortcut = await fetch(`${baseUrl}/report/html`);
    expect(reportHtmlShortcut.status).toBe(200);

    const missingReport = await fetch(`${baseUrl}/report/file`);
    expect(missingReport.status).toBe(400);

    const notFoundReport = await fetch(`${baseUrl}/report/file?path=${encodeURIComponent("missing.txt")}`);
    expect(notFoundReport.status).toBe(404);

    const ui = await fetch(`${baseUrl}/`);
    expect(ui.status).toBe(200);

    const script = await fetch(`${baseUrl}/assets/app.js`);
    expect(script.status).toBe(200);

    const notFound = await fetch(`${baseUrl}/missing`);
    expect(notFound.status).toBe(404);

    await server.stop();
  });

  test("handles missing assets and idempotent lifecycle", async () => {
    const server = new StaticAnalysisServer({ uiRoot: fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-ui-")) });
    const port = await server.start();
    const secondPort = await server.start();
    expect(secondPort).toBe(port);

    const missingAsset = await fetch(`http://localhost:${port}/assets/app.css`);
    expect(missingAsset.status).toBe(404);

    expect(server.createReportFilename("")).toBe("report.json");
    expect(server.createReportFilename("bad@@path", "html")).toContain(".html");
    expect(server.parseUrl("http://[invalid")).toBeNull();

    const badServer = new StaticAnalysisServer();
    badServer.server = { close: (callback) => callback(new Error("fail")) };
    await expect(badServer.stop()).rejects.toThrow("fail");

    await server.stop();
    await server.stop();
  });
});

describe("Static analysis CLI", () => {
  test("resolves options from args and env", () => {
    const options = resolveStaticOptions({
      argv: ["/tmp/root", "--rules-root", "/tmp/rules", "--port", "5050"],
      env: {}
    });

    expect(options).toEqual({
      rootDir: "/tmp/root",
      rulesRoot: "/tmp/rules",
      port: 5050
    });
  });

  test("resolves positional root directory", () => {
    const options = resolveStaticOptions({
      argv: ["/tmp/root"],
      env: {}
    });

    expect(options.rootDir).toBe("/tmp/root");
  });

  test("prefers environment variables for root, rules, and port", () => {
    const options = resolveStaticOptions({
      argv: [],
      env: { ROOT_DIR: "/env/root", RULES_ROOT: "/env/rules", PORT: "8080" }
    });

    expect(options.rootDir).toBe("/env/root");
    expect(options.rulesRoot).toBe("/env/rules");
    expect(options.port).toBe(8080);

    const fallback = resolveStaticOptions({
      argv: [],
      env: { ADA_ROOT_DIR: "/env/ada-root", ADA_RULES_ROOT: "/env/ada-rules", PORT: "9090" }
    });
    expect(fallback.rootDir).toBe("/env/ada-root");
    expect(fallback.rulesRoot).toBe("/env/ada-rules");
    expect(fallback.port).toBe(9090);
  });

  test("supports rootDir and rulesRoot flag variants", () => {
    const options = resolveStaticOptions({
      argv: ["--rootDir", "/tmp/root", "--rulesRoot", "/tmp/rules", "--port", "3000"],
      env: {}
    });

    expect(options.rootDir).toBe("/tmp/root");
    expect(options.rulesRoot).toBe("/tmp/rules");
    expect(options.port).toBe(3000);
  });

  test("handles dashed root and rules flags", () => {
    const options = resolveStaticOptions({
      argv: ["--root-dir", "/tmp/root", "--rules-root", "/tmp/rules", "--port", "7070"],
      env: {}
    });

    expect(options.rootDir).toBe("/tmp/root");
    expect(options.rulesRoot).toBe("/tmp/rules");
    expect(options.port).toBe(7070);
  });

  test("defaults missing flag values to empty or null", () => {
    const missingRoot = resolveStaticOptions({ argv: ["--root-dir"], env: {} });
    expect(missingRoot.rootDir).toBe("");

    const missingRules = resolveStaticOptions({ argv: ["--rules-root"], env: {} });
    expect(missingRules.rulesRoot).toBe(path.resolve(process.cwd(), "../rules"));

    const missingPort = resolveStaticOptions({ argv: ["--port"], env: {} });
    expect(missingPort.port).toBeNull();
  });

  test("resolves root and rules defaults", () => {
    const options = resolveStaticOptions({
      argv: ["--root-dir", "/tmp/root"],
      env: {}
    });

    expect(options.rootDir).toBe("/tmp/root");
    expect(options.rulesRoot).toBe(path.resolve(process.cwd(), "../rules"));
    expect(options.port).toBeNull();
  });

  test("coerces invalid ports to null", () => {
    const options = resolveStaticOptions({
      argv: ["--root-dir", "/tmp/root", "--port", "nope"],
      env: {}
    });

    expect(options.port).toBeNull();
  });

  test("returns non-started result when root directory is missing", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const result = await startStaticAnalysis({
      argv: [],
      env: {},
      logger,
      analyzer: { scanRoot: jest.fn() },
      ServerClass: jest.fn()
    });
    expect(result).toEqual({ started: false });
    expect(logger.error).toHaveBeenCalledWith("Root directory is required.");
  });

  test("starts static analysis server with resolved data", async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const analyzer = {
      scanRoot: jest.fn().mockReturnValue({ documents: [], issues: [] })
    };
    const start = jest.fn().mockResolvedValue(2345);
    const ServerClass = jest.fn().mockImplementation(() => ({ start }));

    const result = await startStaticAnalysis({
      argv: ["/tmp/root", "--rules-root", "/tmp/rules"],
      env: {},
      logger,
      analyzer,
      ServerClass
    });

    expect(ServerClass).toHaveBeenCalledWith({
      documents: [],
      issues: [],
      reportBuilder: expect.any(Object),
      port: 0
    });
    expect(result.started).toBe(true);
    expect(result.port).toBe(2345);
  });

  test("runCli reports errors for rejected scans", async () => {
    const originalExit = process.exitCode;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await runCli({
      argv: ["/tmp/root"],
      env: {},
      analyzer: { scanRoot: () => { throw new Error("boom"); } },
      ServerClass: jest.fn()
    });

    expect(process.exitCode).toBe(1);
    errorSpy.mockRestore();
    process.exitCode = originalExit;
  });

  test("uses default parameters when startStaticAnalysis is called without args", async () => {
    const originalRoot = process.env.ROOT_DIR;
    process.env.ROOT_DIR = "";
    const result = await startStaticAnalysis();
    expect(result).toEqual({ started: false });
    if (originalRoot === undefined) {
      delete process.env.ROOT_DIR;
    } else {
      process.env.ROOT_DIR = originalRoot;
    }
  });

  test("executes runCli when module is main", async () => {
    const Module = require("module");
    const cliPath = require.resolve("../src/static/cli");
    const originalMain = require.main;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const cliModule = new Module(cliPath, module);
    cliModule.filename = cliPath;
    cliModule.paths = Module._nodeModulePaths(path.dirname(cliPath));
    require.main = cliModule;
    cliModule.load(cliPath);
    require.main = originalMain;

    errorSpy.mockRestore();
  });
});

describe("StaticReportBuilder", () => {
  test("includes documents with no issues in file list", () => {
    const builder = new StaticReportBuilder();
    const report = builder.build({
      documents: [{ url: "file-a.html" }, { url: "file-b.css" }, { url: "" }, null],
      issues: []
    });

    expect(report.summary.files).toBe(2);
    expect(report.byFile.map((entry) => entry.filePath).sort()).toEqual(["file-a.html", "file-b.css"]);
  });

  test("includes linked stylesheet issues in file summaries", () => {
    const builder = new StaticReportBuilder();
    const report = builder.build({
      documents: [
        { url: "page.html", stylesheets: ["styles.css"] },
        { url: "styles.css" }
      ],
      issues: [{ ruleId: "rule-1", checkId: "check", filePath: "styles.css" }]
    });

    const entry = report.byFile.find((file) => file.filePath === "page.html");
    expect(entry.linkedStylesheetsWithIssues).toEqual([{ filePath: "styles.css", count: 1 }]);
    expect(entry.linkedStylesheetIssueCount).toBe(1);
  });

  test("returns file report with document info when present", () => {
    const builder = new StaticReportBuilder();
    const fileReport = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [{ url: "file-a.html", contentType: "text/html" }],
      issues: []
    });

    expect(fileReport.document.url).toBe("file-a.html");
  });

  test("builds file summaries with issue ordering", () => {
    const builder = new StaticReportBuilder();
    const summaries = builder.buildFileSummaries({
      documents: [{ url: "b.html" }, { url: "a.html" }],
      issues: [
        { ruleId: "rule-1", checkId: "check", filePath: "a.html", message: "Issue" }
      ]
    });

    expect(summaries[0].filePath).toBe("a.html");
    expect(summaries[0].issueCount).toBe(1);
  });

  test("builds empty summaries when no inputs provided", () => {
    const builder = new StaticReportBuilder();
    const report = builder.build();
    expect(report.summary.files).toBe(0);
    expect(builder.buildFileSummaries()).toEqual([]);
    const fileReport = builder.buildFileReport({ filePath: "missing.txt" });
    expect(fileReport.issueCount).toBe(0);
    const defaultReport = builder.buildFileReport();
    expect(defaultReport.filePath).toBe("unknown");
  });
});
