const fs = require("fs");
const path = require("path");
const os = require("os");
const { RuntimeScanner } = require("../src/runtime/RuntimeScanner");

const createTempRules = (overrides = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-runtime-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  const rule = {
    id: "rule-1",
    description: "desc",
    severity: "low",
    checkId: "missing-label",
    appliesTo: "html",
    ...overrides
  };
  if (overrides.appliesTo === null) {
    delete rule.appliesTo;
  }
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify(rule)
  );
  return root;
};

describe("RuntimeScanner", () => {
  test("scans documents and returns issues", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues).toHaveLength(1);
    expect(result.document.url).toBe("http://example");
  });

  test("skips rules when appliesTo does not match", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "htm"
    });

    expect(result.issues).toHaveLength(0);
  });

  test("skips rules when check is not applicable", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "css"
    });

    expect(result.issues).toHaveLength(0);
  });

  test("applies rules without appliesTo restriction", () => {
    const rulesRoot = createTempRules({ appliesTo: null });
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("deduplicates issues", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />\n<input />",
      kind: "html"
    });

    expect(result.issues).toHaveLength(2);
  });

  test("throws when rules root missing", () => {
    const scanner = new RuntimeScanner();
    expect(() => scanner.scanDocument({ rulesRoot: "", url: "x", content: "", kind: "html" })).toThrow(
      "Rules root is required."
    );
  });
});
