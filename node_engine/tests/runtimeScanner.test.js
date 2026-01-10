const fs = require("fs");
const path = require("path");
const os = require("os");
const { RuntimeScanner } = require("../src/runtime/RuntimeScanner");
const { CheckRegistry } = require("../src/checks/CheckRegistry");
const { MissingLabelCheck } = require("../src/checks/MissingLabelCheck");

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

const createInvalidRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-runtime-invalid-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify({
      id: "rule-1",
      description: "",
      severity: "low",
      checkId: "missing-label"
    })
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
    expect(result.issues[0].teamName).toBe("team");
    expect(result.rules).toHaveLength(1);
    expect(result.document.url).toBe("http://example");
  });

  test("captures linked stylesheets when scanning HTML", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example/page",
      content: "<link rel=\"stylesheet\" href=\"/styles.css\" /><link rel=\"preload\" href=\"skip.css\" />",
      kind: "html"
    });

    expect(result.document.stylesheets).toEqual(["http://example/styles.css"]);
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

  test("skips rules when check is missing from registry", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner({ checkRegistry: new CheckRegistry([]) });
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "html"
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

  test("includes rule metadata when present", () => {
    const rulesRoot = createTempRules({
      recommendation: "Do the thing.",
      wcagCriteria: "1.1.1",
      problemTags: "tag-one"
    });
    const scanner = new RuntimeScanner();
    const result = scanner.scanDocument({
      rulesRoot,
      url: "http://example",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues[0].recommendation).toBe("Do the thing.");
    expect(result.issues[0].wcagCriteria).toBe("1.1.1");
    expect(result.issues[0].problemTags).toBe("tag-one");
  });

  test("falls back when rule metadata is missing", () => {
    const ruleLoader = {
      validateRules: () => ({
        isValid: true,
        errors: [],
        teams: [
          {
            teamName: "team",
            rules: [{ id: "rule-1", checkId: "missing-label" }]
          }
        ]
      })
    };
    const scanner = new RuntimeScanner({
      ruleLoader,
      checkRegistry: new CheckRegistry([MissingLabelCheck])
    });

    const result = scanner.scanDocument({
      rulesRoot: "/tmp",
      url: "http://example",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues[0].ruleDescription).toBe("");
    expect(result.issues[0].severity).toBe("");
    expect(result.issues[0].recommendation).toBeNull();
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

  test("throws when rules fail validation", () => {
    const rulesRoot = createInvalidRules();
    const scanner = new RuntimeScanner();
    expect(() => scanner.scanDocument({ rulesRoot, url: "x", content: "", kind: "html" })).toThrow(
      "Rule validation failed."
    );
  });

  test("deduplicates identical issues from checks", () => {
    const duplicateCheck = {
      id: "dup-check",
      applicableKinds: ["html"],
      run: (context, rule) => ([
        {
          ruleId: rule.id,
          checkId: "dup-check",
          filePath: context.filePath,
          line: 1,
          message: "dup",
          evidence: "<input />"
        },
        {
          ruleId: rule.id,
          checkId: "dup-check",
          filePath: context.filePath,
          line: 1,
          message: "dup",
          evidence: "<input />"
        }
      ])
    };
    const ruleLoader = {
      validateRules: () => ({
        isValid: true,
        errors: [],
        teams: [
          {
            teamName: "team",
            rules: [{ id: "rule-1", description: "desc", severity: "low", checkId: "dup-check" }]
          }
        ]
      })
    };
    const scanner = new RuntimeScanner({
      ruleLoader,
      checkRegistry: new CheckRegistry([duplicateCheck])
    });

    const result = scanner.scanDocument({
      rulesRoot: "/tmp",
      url: "http://example",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("scans evaluated HTML content", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner();
    const result = scanner.scanEvaluatedContent({
      rulesRoot,
      url: "evaluator://html/1",
      content: "<input />",
      kind: "html"
    });

    expect(result.issues).toHaveLength(1);
    expect(result.document.body).toContain("<input");
  });

  test("applies rules to freemarker evaluations via sourceKind", () => {
    const rulesRoot = createTempRules({ appliesTo: "ftl" });
    const scanner = new RuntimeScanner();
    const result = scanner.scanEvaluatedContent({
      rulesRoot,
      url: "evaluator://ftl/1",
      content: "<input />",
      kind: "ftl"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("evaluates css checks against evaluator input", () => {
    const rulesRoot = createTempRules({ checkId: "focus-visible", appliesTo: "css" });
    const scanner = new RuntimeScanner();
    const result = scanner.scanEvaluatedContent({
      rulesRoot,
      url: "evaluator://css/1",
      content: "a:focus{outline:none}",
      kind: "css"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("evaluates embedded HTML in JavaScript snippets", () => {
    const rulesRoot = createTempRules({ checkId: "missing-alt-text", appliesTo: "html" });
    const scanner = new RuntimeScanner();
    const result = scanner.scanEvaluatedContent({
      rulesRoot,
      url: "evaluator://js/1",
      content: "const template = `<img src=\"photo.jpg\">`;",
      kind: "js"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("evaluates embedded CSS in JavaScript snippets", () => {
    const rulesRoot = createTempRules({ checkId: "focus-visible", appliesTo: "css" });
    const scanner = new RuntimeScanner();
    const result = scanner.scanEvaluatedContent({
      rulesRoot,
      url: "evaluator://js/2",
      content: "const styles = `a:focus{outline:none}`;",
      kind: "js"
    });

    expect(result.issues).toHaveLength(1);
  });

  test("throws when evaluator rules root missing", () => {
    const scanner = new RuntimeScanner();
    expect(() => scanner.scanEvaluatedContent({
      rulesRoot: "",
      url: "evaluator://html/1",
      content: "<input />",
      kind: "html"
    })).toThrow("Rules root is required.");
  });

  test("builds evaluation contexts with defaults and fallbacks", () => {
    const scanner = new RuntimeScanner();
    const htmlContexts = scanner.buildEvaluationContexts({
      content: "<div></div>",
      url: "evaluator://html/2"
    });
    expect(htmlContexts[0].kind).toBe("html");
    expect(htmlContexts[0].document).not.toBeNull();

    const jsContexts = scanner.buildEvaluationContexts({
      content: "const value = '<div></div>';",
      kind: "js",
      url: "evaluator://js/3"
    });
    expect(jsContexts[0].sourceKind).toBe("js");

    const cssContexts = scanner.buildEvaluationContexts({
      content: "a:focus{outline:none}",
      kind: "css",
      url: "evaluator://css/2"
    });
    expect(cssContexts[0].sourceKind).toBe("css");
  });
});
