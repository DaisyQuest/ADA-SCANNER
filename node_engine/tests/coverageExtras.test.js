const fs = require("fs");
const path = require("path");
const os = require("os");
const { CheckRegistry } = require("../src/checks/CheckRegistry");
const { AbsolutePositioningCheck, tryGetCanvasPositioning } = require("../src/checks/AbsolutePositioningCheck");
const { FixedWidthLayoutCheck, tryGetFixedStyleWidth, isFixedMarkupLength } = require("../src/checks/FixedWidthLayoutCheck");
const { MissingLabelCheck } = require("../src/checks/MissingLabelCheck");
const { HiddenNavigationCheck, hasHiddenStyle } = require("../src/checks/HiddenNavigationCheck");
const {
  HiddenFocusableElementCheck,
  isSelfClosing,
  isXamlFocusable
} = require("../src/checks/HiddenFocusableElementCheck");
const { InsufficientContrastCheck, resolveStaticColor } = require("../src/checks/InsufficientContrastCheck");
const { RuleLoader } = require("../src/rules/RuleLoader");
const { RuntimeScanner } = require("../src/runtime/RuntimeScanner");
const { ListenerServer } = require("../src/listener/ListenerServer");
const engine = require("../src/index");

const createContext = (content, kind = "html") => ({
  filePath: "file",
  content,
  kind
});

const rule = { id: "rule-1" };

const createTempRules = (ruleOverrides = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-extra-"));
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
      ...ruleOverrides
    })
  );
  return root;
};

describe("Coverage extras", () => {
  test("CheckRegistry rejects invalid checks and lists", () => {
    const registry = new CheckRegistry();
    expect(() => registry.register({})).toThrow("Check must have an id");
    registry.register({ id: "test", applicableKinds: [], run: () => [] });
    expect(registry.find("test")).not.toBeNull();
    expect(registry.list()).toHaveLength(1);
  });

  test("AbsolutePositioningCheck handles non-matching elements", () => {
    expect(tryGetCanvasPositioning("")) .toBeNull();
    const context = createContext('<div style="position:relative"></div>');
    expect(AbsolutePositioningCheck.run(context, rule)).toHaveLength(0);
  });

  test("FixedWidthLayoutCheck handles non-fixed widths", () => {
    expect(tryGetFixedStyleWidth("height:10px")).toBeNull();
    expect(isFixedMarkupLength("100")) .toBe(true);
    const context = createContext('<div style="width:auto"></div>');
    expect(FixedWidthLayoutCheck.run(context, rule)).toHaveLength(0);
  });

  test("MissingLabelCheck skips aria labels", () => {
    const context = createContext('<input aria-label="Name" />');
    expect(MissingLabelCheck.run(context, rule)).toHaveLength(0);
  });

  test("HiddenNavigationCheck handles visibility hidden", () => {
    expect(hasHiddenStyle("visibility: hidden")) .toBe(true);
    const context = createContext('<nav style="visibility:hidden"></nav>');
    expect(HiddenNavigationCheck.run(context, rule)).toHaveLength(1);
  });

  test("HiddenFocusableElementCheck treats void elements as self-closing", () => {
    expect(isSelfClosing({ groups: { self: "" } }, "img", { kind: "html" })).toBe(true);
    expect(isXamlFocusable('TabIndex="1"')).toBe(true);

    const context = createContext('<img hidden tabindex="0" />');
    expect(HiddenFocusableElementCheck.run(context, rule)).toHaveLength(1);
  });

  test("InsufficientContrastCheck handles unresolved colors", () => {
    expect(resolveStaticColor("var(--token)")).toBeNull();
    const context = createContext('<div style="color: var(--a); background-color: #000"></div>');
    expect(InsufficientContrastCheck.run(context, rule)).toHaveLength(0);
  });

  test("RuleLoader handles unsupported extensions", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-extra-rule-"));
    const filePath = path.join(tempDir, "rule.txt");
    fs.writeFileSync(filePath, "invalid");

    const loader = new RuleLoader();
    expect(() => loader.loadRule(filePath)).toThrow("Unsupported rule file format");
  });

  test("RuntimeScanner throws on invalid rule schema", () => {
    const rulesRoot = createTempRules({ severity: "urgent" });
    const scanner = new RuntimeScanner();
    expect(() =>
      scanner.scanDocument({ rulesRoot, url: "http://example", content: "<input />", kind: "html" })
    ).toThrow("Rule validation failed");
  });

  test("RuntimeScanner skips missing checks", () => {
    const rulesRoot = createTempRules();
    const scanner = new RuntimeScanner({ checkRegistry: new CheckRegistry() });
    const result = scanner.scanDocument({ rulesRoot, url: "http://example", content: "<input />", kind: "html" });
    expect(result.issues).toHaveLength(0);
  });

  test("ListenerServer start/stop idempotence", async () => {
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();
    const secondPort = await server.start();
    expect(secondPort).toBe(port);
    await server.stop();
    await server.stop();
  });

  test("engine index exports expected symbols", () => {
    expect(engine.RuntimeScanner).toBeDefined();
    expect(engine.ListenerServer).toBeDefined();
    expect(engine.ReportBuilder).toBeDefined();
  });
});
