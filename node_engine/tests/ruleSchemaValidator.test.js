const { RuleSchemaValidator } = require("../src/rules/RuleSchemaValidator");

describe("RuleSchemaValidator", () => {
  test("accepts a valid rule", () => {
    const validator = new RuleSchemaValidator();
    const errors = validator.validate({
      id: "rule-1",
      description: "desc",
      severity: "High",
      checkId: "missing-label",
      appliesTo: "html, htm, ftl",
      recommendation: "fix",
      wcagCriteria: "1.4.3",
      problemTags: "document-language"
    });

    expect(errors).toEqual([]);
  });

  test("reports missing required fields and invalid values", () => {
    const validator = new RuleSchemaValidator();
    const errors = validator.validate({
      id: "",
      description: "",
      severity: "urgent",
      checkId: "nope",
      appliesTo: "html, madeup",
      wcagCriteria: "1.4",
      problemTags: "bad tag"
    });

    expect(errors).toEqual([
      "Rule id is required.",
      "Rule description is required.",
      "Rule severity must be low, medium, or high.",
      "Rule check id is invalid or missing.",
      "Rule appliesTo contains invalid values: madeup.",
      "Rule wcagCriteria must list WCAG success criteria like 1.4.3.",
      "Rule problemTags must be comma-separated slugs like document-language."
    ]);
  });

  test("ignores empty optional fields", () => {
    const validator = new RuleSchemaValidator();
    const errors = validator.validate({
      id: "rule-2",
      description: "desc",
      severity: "low",
      checkId: "missing-label",
      appliesTo: " ",
      wcagCriteria: "",
      problemTags: null
    });

    expect(errors).toEqual([]);
  });

  test("accepts newly supported check ids", () => {
    const validator = new RuleSchemaValidator();
    const errors = validator.validate({
      id: "rule-3",
      description: "desc",
      severity: "medium",
      checkId: "empty-heading"
    });

    expect(errors).toEqual([]);
  });
});
