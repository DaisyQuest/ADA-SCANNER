const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  SUPPORTED_EXTENSIONS,
  normalizeExtension,
  resolveGoldMasterOptions
} = require("../src/goldmaster/options");
const { runGoldMaster } = require("../src/goldmaster/GoldMasterRunner");
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
});

describe("goldmaster runner", () => {
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

  test("startGoldMaster reports option errors", async () => {
    const logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
    const result = await startGoldMaster({ argv: [], env: {}, logger });
    expect(result.started).toBe(false);
    expect(result.errors).toContain("No extensions selected. Use --all or --ext.");
  });
});
