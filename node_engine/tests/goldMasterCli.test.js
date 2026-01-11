const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  SUPPORTED_EXTENSIONS,
  normalizeExtension,
  resolveGoldMasterOptions
} = require("../src/goldmaster/options");
const {
  GoldMaster_Report,
  buildExtensionMap,
  buildGoldMasterReport,
  ensureDirectory,
  runGoldMaster
} = require("../src/goldmaster/GoldMasterRunner");
const { startGoldMaster } = require("../src/goldmaster/cli");

const createTempRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-rules-"));
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

const createGoldMasterRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-root-"));
  const htmlDir = path.join(root, "html");
  fs.mkdirSync(htmlDir, { recursive: true });
  fs.writeFileSync(path.join(htmlDir, "gm-html-001-sample.html"), "<input type=\"text\">");
  fs.writeFileSync(
    path.join(htmlDir, "gm-html-001-sample.expectations.json"),
    JSON.stringify({ rules: ["rule-1"] }, null, 2)
  );
  return root;
};

describe("goldmaster options", () => {
  test("normalizes extensions and validates support", () => {
    expect(normalizeExtension()).toBeNull();
    expect(normalizeExtension("html")).toBe(".html");
    expect(normalizeExtension(".razor")).toBe(".razor");
    expect(normalizeExtension("ftl")).toBe(".ftl");
    expect(normalizeExtension("JS")).toBe(".js");
    expect(normalizeExtension("TXT")).toBeNull();
    expect(normalizeExtension(" ")).toBeNull();
  });

  test("resolves --all to all supported extensions", () => {
    const options = resolveGoldMasterOptions({ argv: ["--all"], env: {}, cwd: "/tmp" });
    expect(options.errors).toEqual([]);
    expect(options.extensions).toEqual(SUPPORTED_EXTENSIONS);
  });

  test("parses --ext and output directory", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "html,razor", "--outputDir", "/tmp/out", "--compare", "/tmp/baseline.json", "--save", "/tmp/save.json"],
      env: {},
      cwd: "/tmp"
    });
    expect(options.errors).toEqual([]);
    expect(options.extensions).toEqual([".html", ".razor"]);
    expect(options.outputDir).toBe("/tmp/out");
    expect(options.comparePath).toBe("/tmp/baseline.json");
    expect(options.savePath).toBe("/tmp/save.json");
  });

  test("reports unknown or malformed options", () => {
    const options = resolveGoldMasterOptions({ argv: ["--ext", "txt", "--bad"], env: {}, cwd: "/tmp" });
    expect(options.errors).toContain("Unsupported extension: txt");
    expect(options.errors).toContain("Unknown option: --bad");
  });

  test("flags missing option values", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "--outputDir", "--compare", "--save"],
      env: {},
      cwd: "/tmp"
    });
    expect(options.errors).toContain("--ext requires a value.");
    expect(options.errors).toContain("--outputDir requires a value.");
    expect(options.errors).toContain("--compare requires a value.");
    expect(options.errors).toContain("--save requires a value.");
  });

  test("respects environment defaults while still validating extensions", () => {
    const options = resolveGoldMasterOptions({
      argv: [],
      env: {
        GOLDMASTER_ROOT_DIR: "/env/root",
        GOLDMASTER_RULES_ROOT: "/env/rules",
        GOLDMASTER_OUTPUT_DIR: "/env/out"
      },
      cwd: "/tmp"
    });
    expect(options.rootDir).toBe("/env/root");
    expect(options.rulesRoot).toBe("/env/rules");
    expect(options.outputDir).toBe("/env/out");
    expect(options.errors).toContain("No extensions selected. Use --all or --ext.");
  });

  test("uses process defaults when no arguments are provided", () => {
    const options = resolveGoldMasterOptions();
    expect(options.rootDir).toContain(path.join("goldmaster"));
    expect(options.outputDir).toContain(path.join("goldmaster_output"));
    expect(options.errors).toContain("No extensions selected. Use --all or --ext.");
  });

  test("falls back to RULES_ROOT then ADA_RULES_ROOT when rules root is unset", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "html"],
      env: {
        RULES_ROOT: "/env/rules"
      },
      cwd: "/tmp"
    });
    expect(options.rulesRoot).toBe("/env/rules");

    const fallbackOptions = resolveGoldMasterOptions({
      argv: ["--ext", "html"],
      env: {
        ADA_RULES_ROOT: "/env/ada-rules"
      },
      cwd: "/tmp"
    });
    expect(fallbackOptions.rulesRoot).toBe("/env/ada-rules");
  });

  test("parses mixed-case extensions and trims outputDir values", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "HTML, .HTM, razor, ftl, JS", "--outputDir", "  /tmp/out  "],
      env: {},
      cwd: "/tmp"
    });
    expect(options.extensions).toEqual([".html", ".htm", ".razor", ".ftl", ".js"]);
    expect(options.outputDir).toBe("/tmp/out");
  });

  test("trims compare and save paths", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "html", "--compare", "  /tmp/base.json  ", "--save", "  /tmp/save.json  "],
      env: {},
      cwd: "/tmp"
    });
    expect(options.comparePath).toBe("/tmp/base.json");
    expect(options.savePath).toBe("/tmp/save.json");
  });

  test("deduplicates extensions unless --all is set", () => {
    const options = resolveGoldMasterOptions({ argv: ["--ext", "html,html,razor"], env: {}, cwd: "/tmp" });
    expect(options.errors).toEqual([]);
    expect(options.extensions).toEqual([".html", ".razor"]);
  });

  test("uses --all even when --ext is malformed", () => {
    const options = resolveGoldMasterOptions({ argv: ["--ext", "--all"], env: {}, cwd: "/tmp" });
    expect(options.errors).toContain("--ext requires a value.");
    expect(options.extensions).toEqual(SUPPORTED_EXTENSIONS);
  });

  test("flags empty outputDir values", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "html", "--outputDir", "   "],
      env: {},
      cwd: "/tmp"
    });
    expect(options.errors).toContain("--outputDir requires a value.");
  });

  test("flags empty compare/save values", () => {
    const options = resolveGoldMasterOptions({
      argv: ["--ext", "html", "--compare", "   ", "--save", "   "],
      env: {},
      cwd: "/tmp"
    });
    expect(options.errors).toContain("--compare requires a value.");
    expect(options.errors).toContain("--save requires a value.");
  });
});

describe("goldmaster helpers", () => {
  test("buildExtensionMap includes supported extensions only", () => {
    const extensionMap = buildExtensionMap([".html", ".ftl", ".bogus"]);
    expect(extensionMap.has(".html")).toBe(true);
    expect(extensionMap.has(".ftl")).toBe(true);
    expect(extensionMap.has(".bogus")).toBe(false);
    expect(extensionMap.size).toBe(2);
  });

  test("buildExtensionMap handles non-array input", () => {
    const extensionMap = buildExtensionMap(null);
    expect(extensionMap.size).toBe(0);
  });

  test("ensureDirectory creates directories and handles falsy values", () => {
    const outputDir = path.join(os.tmpdir(), `ada-gm-dir-${Date.now()}`);
    expect(ensureDirectory(outputDir)).toBe(true);
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(ensureDirectory("")).toBe(false);
  });

  test("GoldMaster_Report mirrors buildGoldMasterReport payloads", () => {
    const report = { summary: { documents: 1, issues: 0 } };
    const payload = GoldMaster_Report({
      report,
      extension: ".html",
      rootDir: "/tmp/root",
      generatedAt: "2024-01-01T00:00:00.000Z"
    });
    expect(payload).toEqual(buildGoldMasterReport({
      report,
      extension: ".html",
      rootDir: "/tmp/root",
      generatedAt: "2024-01-01T00:00:00.000Z"
    }));
  });
});

describe("goldmaster runner", () => {
  test("requires rootDir and rulesRoot", async () => {
    await expect(runGoldMaster({})).rejects.toThrow("GoldMaster rootDir, rulesRoot, and outputDir are required.");
  });

  test("requires outputDir for report generation", async () => {
    await expect(runGoldMaster({ rootDir: "/tmp/root", rulesRoot: "/tmp/rules" }))
      .rejects.toThrow("GoldMaster rootDir, rulesRoot, and outputDir are required.");
  });

  test("writes custom analyzer output into report files", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-custom-"));
    fs.mkdirSync(path.join(rootDir, "html"), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, "html", "doc.expectations.json"),
      JSON.stringify({ rules: ["rule-1"] }, null, 2)
    );
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    const analyzer = { scanRoot: jest.fn(() => ({
      documents: [{ url: "doc.html" }],
      issues: [{ ruleId: "rule-1", filePath: "doc.html" }],
      rules: [{ id: "rule-1" }]
    })) };
    const analyzerFactory = jest.fn(() => analyzer);
    const reportBuilder = { build: jest.fn(() => ({
      summary: { documents: 1, issues: 1 }
    })) };

    const result = await runGoldMaster({
      rootDir,
      rulesRoot: "/tmp/rules",
      outputDir,
      extensions: [".html"],
      analyzerFactory,
      reportBuilder
    });

    expect(analyzerFactory).toHaveBeenCalledTimes(1);
    expect(analyzer.scanRoot).toHaveBeenCalledWith({ rootDir: path.join(rootDir, "html"), rulesRoot: "/tmp/rules" });
    expect(reportBuilder.build).toHaveBeenCalledTimes(1);
    expect(result.summary.results[0].documentCount).toBe(1);
    expect(result.summary.totalDocuments).toBe(1);
    expect(result.summary.totalIssues).toBe(1);

    const reportPath = result.summary.results[0].reportPath;
    const payload = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
    expect(payload.extension).toBe(".html");
    expect(payload.rootDir).toBe(path.join(rootDir, "html"));
    expect(payload.report.summary.issues).toBe(1);
  });

  test("writes reports for available extensions and records missing ones", async () => {
    const rulesRoot = createTempRules();
    const rootDir = createGoldMasterRoot();
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };

    const result = await runGoldMaster({
      rootDir,
      rulesRoot,
      outputDir,
      extensions: [".html", ".razor"],
      logger
    });

    expect(fs.existsSync(result.summaryPath)).toBe(true);
    expect(result.summary.results).toHaveLength(2);
    const htmlResult = result.summary.results.find((entry) => entry.extension === ".html");
    const razorResult = result.summary.results.find((entry) => entry.extension === ".razor");

    expect(htmlResult.status).toBe("complete");
    expect(razorResult.status).toBe("missing");
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(".razor"));
    expect(result.summary.totalDocuments).toBeGreaterThanOrEqual(0);
    expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
  });

  test("marks unsupported extensions as unsupported and skips analysis", async () => {
    const rulesRoot = createTempRules();
    const rootDir = createGoldMasterRoot();
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const analyzerFactory = jest.fn();

    const result = await runGoldMaster({
      rootDir,
      rulesRoot,
      outputDir,
      extensions: [".bogus"],
      logger,
      analyzerFactory
    });

    expect(result.summary.results).toHaveLength(1);
    expect(result.summary.results[0].status).toBe("unsupported");
    expect(logger.warn).toHaveBeenCalledWith("GoldMaster extension unsupported: .bogus");
    expect(analyzerFactory).not.toHaveBeenCalled();
  });

  test("writes an empty summary when no extensions are provided", async () => {
    const rulesRoot = createTempRules();
    const rootDir = createGoldMasterRoot();
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));

    const result = await runGoldMaster({
      rootDir,
      rulesRoot,
      outputDir,
      extensions: []
    });

    expect(result.summary.totalExtensions).toBe(0);
    expect(result.summary.results).toEqual([]);
    expect(fs.existsSync(result.summaryPath)).toBe(true);
  });

  test("defaults document and issue counts when report summary is missing values", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-missing-summary-"));
    fs.mkdirSync(path.join(rootDir, "html"), { recursive: true });
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    const analyzer = { scanRoot: jest.fn(() => ({ documents: [], issues: [], rules: [] })) };
    const analyzerFactory = jest.fn(() => analyzer);
    const reportBuilder = { build: jest.fn(() => ({ summary: {} })) };

    const result = await runGoldMaster({
      rootDir,
      rulesRoot: "/tmp/rules",
      outputDir,
      extensions: [".html"],
      analyzerFactory,
      reportBuilder
    });

    expect(result.summary.results[0].documentCount).toBe(0);
    expect(result.summary.results[0].issueCount).toBe(0);
    expect(result.summary.totalDocuments).toBe(0);
    expect(result.summary.totalIssues).toBe(0);
  });

  test("scans each existing extension directory and writes reports", async () => {
    const rulesRoot = createTempRules();
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-multi-"));
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    fs.mkdirSync(path.join(rootDir, "html"), { recursive: true });
    fs.mkdirSync(path.join(rootDir, "htm"), { recursive: true });

    const analyzers = [];
    const analyzerFactory = jest.fn(() => {
      const analyzer = {
        scanRoot: jest.fn(() => ({ documents: [], issues: [], rules: [] }))
      };
      analyzers.push(analyzer);
      return analyzer;
    });
    const reportBuilder = {
      build: jest.fn(() => ({ summary: { documents: 0, issues: 0 } }))
    };

    const result = await runGoldMaster({
      rootDir,
      rulesRoot,
      outputDir,
      extensions: [".html", ".htm"],
      analyzerFactory,
      reportBuilder
    });

    expect(analyzerFactory).toHaveBeenCalledTimes(2);
    expect(analyzers[0].scanRoot).toHaveBeenCalledWith({ rootDir: path.join(rootDir, "html"), rulesRoot });
    expect(analyzers[1].scanRoot).toHaveBeenCalledWith({ rootDir: path.join(rootDir, "htm"), rulesRoot });
    expect(result.summary.results).toHaveLength(2);
    expect(fs.existsSync(result.summary.results[0].reportPath)).toBe(true);
  });

  test("startGoldMaster reports option errors", async () => {
    const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const result = await startGoldMaster({ argv: [], env: {}, logger });
    expect(result.started).toBe(false);
    expect(result.errors).toContain("No extensions selected. Use --all or --ext.");
  });

  test("startGoldMaster logs success when reports are generated", async () => {
    jest.resetModules();
    const summaryPath = "/tmp/goldmaster-summary.json";
    const mockRunGoldMaster = jest.fn().mockResolvedValue({
      summaryPath,
      summary: { results: [] },
      reports: []
    });

    await new Promise((resolve, reject) => {
      jest.isolateModules(() => {
        jest.doMock("../src/goldmaster/GoldMasterRunner", () => ({
          runGoldMaster: mockRunGoldMaster
        }));
        const { startGoldMaster: mockedStartGoldMaster } = require("../src/goldmaster/cli");
        const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };

        mockedStartGoldMaster({ argv: ["--all"], env: {}, logger })
          .then((result) => {
            expect(result.started).toBe(true);
            expect(logger.log).toHaveBeenCalledWith(`GoldMaster reports written to ${summaryPath}`);
            resolve();
          })
          .catch(reject);
      });
    });
  });

  test("startGoldMaster uses default argv values when none are provided", async () => {
    jest.resetModules();
    const summaryPath = "/tmp/goldmaster-summary.json";
    const mockRunGoldMaster = jest.fn().mockResolvedValue({
      summaryPath,
      summary: { results: [] },
      reports: []
    });
    const originalArgv = process.argv;
    process.argv = ["node", "cli", "--all"];

    try {
      await new Promise((resolve, reject) => {
        jest.isolateModules(() => {
          jest.doMock("../src/goldmaster/GoldMasterRunner", () => ({
            runGoldMaster: mockRunGoldMaster
          }));
          const { startGoldMaster: mockedStartGoldMaster } = require("../src/goldmaster/cli");
          const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };

          mockedStartGoldMaster()
            .then((result) => {
              expect(result.started).toBe(true);
              expect(mockRunGoldMaster).toHaveBeenCalled();
              resolve();
            })
            .catch(reject);
        });
      });
    } finally {
      process.argv = originalArgv;
    }
  });

  test("startGoldMaster saves report bundles when --save is provided", async () => {
    jest.resetModules();
    const summaryPath = "/tmp/goldmaster-summary.json";
    const savePath = path.join(os.tmpdir(), `goldmaster-save-${Date.now()}.json`);
    const mockRunGoldMaster = jest.fn().mockResolvedValue({
      summaryPath,
      summary: { results: [] },
      reports: [{ extension: ".html", report: { summary: { documents: 1, issues: 0 } } }]
    });

    await new Promise((resolve, reject) => {
      jest.isolateModules(() => {
        jest.doMock("../src/goldmaster/GoldMasterRunner", () => ({
          runGoldMaster: mockRunGoldMaster
        }));
        const { startGoldMaster: mockedStartGoldMaster } = require("../src/goldmaster/cli");
        const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };

        mockedStartGoldMaster({ argv: ["--all", "--save", savePath], env: {}, logger })
          .then((result) => {
            const savedPayload = JSON.parse(fs.readFileSync(savePath, "utf-8"));
            expect(result.savedReportPath).toBe(savePath);
            expect(savedPayload.summary).toEqual({ results: [] });
            expect(savedPayload.reports).toHaveLength(1);
            resolve();
          })
          .catch(reject);
      });
    });
  });

  test("startGoldMaster compares against saved reports when --compare is provided", async () => {
    jest.resetModules();
    const summaryPath = "/tmp/goldmaster-summary.json";
    const comparePath = path.join(os.tmpdir(), `goldmaster-compare-${Date.now()}.json`);
    fs.writeFileSync(comparePath, JSON.stringify({
      summary: {
        results: [{ extension: ".html", status: "complete", documentCount: 1, issueCount: 1 }]
      }
    }));

    const mockRunGoldMaster = jest.fn().mockResolvedValue({
      summaryPath,
      summary: { results: [{ extension: ".html", status: "complete", documentCount: 2, issueCount: 1 }] },
      reports: []
    });

    await new Promise((resolve, reject) => {
      jest.isolateModules(() => {
        jest.doMock("../src/goldmaster/GoldMasterRunner", () => ({
          runGoldMaster: mockRunGoldMaster
        }));
        const { startGoldMaster: mockedStartGoldMaster } = require("../src/goldmaster/cli");
        const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };

        mockedStartGoldMaster({ argv: ["--all", "--compare", comparePath], env: {}, logger })
          .then((result) => {
            expect(result.comparison).not.toBeNull();
            expect(result.comparison.totals.changed).toBe(1);
            expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("GoldMaster comparison"));
            resolve();
          })
          .catch(reject);
      });
    });
  });

  test("runCli sets exitCode when goldmaster execution fails", async () => {
    const errorMessage = "boom";
    jest.resetModules();
    await new Promise((resolve, reject) => {
      jest.isolateModules(() => {
        jest.doMock("../src/goldmaster/GoldMasterRunner", () => ({
          runGoldMaster: jest.fn().mockRejectedValue(new Error(errorMessage))
        }));
        const { runCli } = require("../src/goldmaster/cli");
        const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const originalExitCode = process.exitCode;
        process.exitCode = undefined;

        runCli({ argv: ["--all"], env: {}, logger: console })
          .then(() => {
            expect(process.exitCode).toBe(1);
            expect(errorSpy).toHaveBeenCalledWith(errorMessage);
            errorSpy.mockRestore();
            process.exitCode = originalExitCode;
            resolve();
          })
          .catch((error) => {
            errorSpy.mockRestore();
            process.exitCode = originalExitCode;
            reject(error);
          });
      });
    });
  });
});
