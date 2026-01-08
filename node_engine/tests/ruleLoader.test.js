const fs = require("fs");
const path = require("path");
const os = require("os");
const { RuleLoader, parseJsonRule, parseSimpleYamlRule } = require("../src/rules/RuleLoader");

const createTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "ada-node-"));

const writeFile = (filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

describe("RuleLoader", () => {
  test("loads rules grouped by team", () => {
    const tempDir = createTempDir();
    writeFile(
      path.join(tempDir, "team-a", "rule.json"),
      JSON.stringify({
        id: "rule-a",
        description: "desc",
        severity: "low",
        checkId: "missing-label"
      })
    );
    writeFile(
      path.join(tempDir, "team-b", "rule.yaml"),
      "id: rule-b\ndescription: desc\nseverity: high\ncheckId: missing-label"
    );

    const loader = new RuleLoader();
    const teams = loader.loadRules(tempDir);

    expect(teams).toHaveLength(2);
    expect(teams.find((team) => team.teamName === "team-a").rules[0].id).toBe("rule-a");
    expect(teams.find((team) => team.teamName === "team-b").rules[0].id).toBe("rule-b");
  });

  test("validates rules and captures schema errors", () => {
    const tempDir = createTempDir();
    writeFile(
      path.join(tempDir, "team-a", "rule.json"),
      JSON.stringify({
        id: "rule-a",
        description: "",
        severity: "low",
        checkId: "missing-label",
        appliesTo: "unknown"
      })
    );

    const loader = new RuleLoader();
    const result = loader.validateRules(tempDir);

    expect(result.isValid).toBe(false);
    expect(result.errors.map((error) => error.message)).toEqual([
      "Rule description is required.",
      "Rule appliesTo contains invalid values: unknown."
    ]);
  });

  test("captures parse errors in invalid JSON when validating", () => {
    const tempDir = createTempDir();
    writeFile(path.join(tempDir, "team-a", "rule.json"), "{ not-json }");

    const loader = new RuleLoader();
    const result = loader.validateRules(tempDir);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].message).toContain("empty or invalid JSON");
  });

  test("throws on invalid JSON when loading a single rule", () => {
    const tempDir = createTempDir();
    const filePath = path.join(tempDir, "team-a", "rule.json");
    writeFile(filePath, "{ not-json }");

    const loader = new RuleLoader();
    expect(() => loader.loadRule(filePath)).toThrow();
  });

  test("throws on invalid JSON when loading rules", () => {
    const tempDir = createTempDir();
    writeFile(path.join(tempDir, "team-a", "rule.json"), "{ invalid");

    const loader = new RuleLoader();
    expect(() => loader.loadRules(tempDir)).toThrow("Rule file");
  });

  test("ignores unsupported extensions", () => {
    const tempDir = createTempDir();
    writeFile(path.join(tempDir, "team-a", "rule.txt"), "ignored");

    const loader = new RuleLoader();
    const teams = loader.loadRules(tempDir);

    expect(teams[0].rules).toHaveLength(0);
  });

  test("validateRules skips unsupported extensions", () => {
    const tempDir = createTempDir();
    writeFile(path.join(tempDir, "team-a", "rule.txt"), "ignored");

    const loader = new RuleLoader();
    const result = loader.validateRules(tempDir);
    expect(result.errors).toHaveLength(0);
  });

  test("throws when JSON parses but fails schema shape", () => {
    const tempDir = createTempDir();
    writeFile(path.join(tempDir, "team-a", "rule.json"), JSON.stringify([1, 2, 3]));

    const loader = new RuleLoader();
    expect(() => loader.loadRules(tempDir)).toThrow("Rule definition must be a JSON object.");
  });

  test("parseJsonRule validates allowed properties", () => {
    const result = parseJsonRule(JSON.stringify({ id: "rule", extra: "bad" }), "rule.json");
    expect(result.errors).toContain("Unknown property 'extra'.");
    expect(result.ruleIdForError).toBe("rule");
  });

  test("parseSimpleYamlRule validates required properties", () => {
    const result = parseSimpleYamlRule(["description: desc"], "rule.yml");
    expect(result.errors).toContain("Missing required property 'id'.");
  });

  test("parseJsonRule rejects non-object payloads", () => {
    const result = parseJsonRule(JSON.stringify([1, 2, 3]), "rule.json");
    expect(result.errors).toContain("Rule definition must be a JSON object.");
    expect(result.hasParseError).toBe(true);
  });

  test("parseJsonRule flags non-string property values", () => {
    const result = parseJsonRule(JSON.stringify({ id: 1, description: "d", severity: "low", checkId: "missing-label" }), "rule.json");
    expect(result.errors).toContain("Property 'id' must be a string.");
  });

  test("parseSimpleYamlRule flags unknown properties", () => {
    const result = parseSimpleYamlRule(["unknown: value"], "rule.yml");
    expect(result.errors).toContain("Unknown property 'unknown'.");
  });

  test("parseSimpleYamlRule skips comments and invalid lines", () => {
    const result = parseSimpleYamlRule(["# comment", "badline", "id: rule", "description: desc", "severity: low", "checkId: missing-label"], "rule.yml");
    expect(result.rule.id).toBe("rule");
  });

  test("throws when rules root is invalid", () => {
    const loader = new RuleLoader();
    expect(() => loader.loadRules("")).toThrow("Rules root is required.");
    expect(() => loader.validateRules("/no/such/dir")).toThrow("Rules directory not found");
  });
});
