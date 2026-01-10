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
      checkId: "insufficient-contrast",
      appliesTo: "html"
    })
  );
  return root;
};

const createGoldMasterRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-root-"));
  const htmlDir = path.join(root, "html");
  fs.mkdirSync(htmlDir, { recursive: true });
  fs.writeFileSync(
    path.join(htmlDir, "gm-html-001-sample.html"),
    "<div style=\"color:#777;background:#888\">Low contrast</div>"
  );
  return root;
};

describe("goldmaster options", () => {
  test("normalizes extensions and validates support", () => {
    expect(normalizeExtension("html")).toBe(".html");
    expect(normalizeExtension(".razor")).toBe(".razor");
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
      argv: ["--ext", "html,razor", "--outputDir", "/tmp/out"],
      env: {},
      cwd: "/tmp"
    });
    expect(options.errors).toEqual([]);
    expect(options.extensions).toEqual([".html", ".razor"]);
    expect(options.outputDir).toBe("/tmp/out");
  });

  test("reports unknown or malformed options", () => {
    const options = resolveGoldMasterOptions({ argv: ["--ext", "txt", "--bad"], env: {}, cwd: "/tmp" });
    expect(options.errors).toContain("Unsupported extension: txt");
    expect(options.errors).toContain("Unknown option: --bad");
  });

  test("flags missing option values", () => {
    const options = resolveGoldMasterOptions({ argv: ["--ext", "--outputDir"], env: {}, cwd: "/tmp" });
    expect(options.errors).toContain("--ext requires a value.");
    expect(options.errors).toContain("--outputDir requires a value.");
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
      argv: ["--ext", "HTML, .HTM, razor", "--outputDir", "  /tmp/out  "],
      env: {},
      cwd: "/tmp"
    });
    expect(options.extensions).toEqual([".html", ".htm", ".razor"]);
    expect(options.outputDir).toBe("/tmp/out");
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
});

describe("goldmaster helpers", () => {
  test("buildExtensionMap includes supported extensions only", () => {
    const extensionMap = buildExtensionMap([".html", ".bogus"]);
    expect(extensionMap.has(".html")).toBe(true);
    expect(extensionMap.has(".bogus")).toBe(false);
    expect(extensionMap.size).toBe(1);
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
    await expect(runGoldMaster({})).rejects.toThrow("GoldMaster rootDir and rulesRoot are required.");
  });

  test("writes custom analyzer output into report files", async () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-custom-"));
    fs.mkdirSync(path.join(rootDir, "html"), { recursive: true });
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-out-"));
    const analyzer = { scanRoot: jest.fn(() => ({
      documents: [{ url: "doc.html" }],
      issues: [{ ruleId: "rule-1" }],
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
      summary: { results: [] }
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
