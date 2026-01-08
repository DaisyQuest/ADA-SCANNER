const AllowedSeverities = new Set(["low", "medium", "high"]);
const AllowedChecks = new Set([
  "absolute-positioning",
  "fixed-width-layout",
  "missing-label",
  "missing-document-language",
  "unlabeled-button",
  "missing-page-title",
  "missing-table-headers",
  "missing-alt-text",
  "non-wrapping-container",
  "invalid-aria-role",
  "hidden-navigation",
  "hidden-focusable",
  "insufficient-contrast",
  "xaml-missing-name",
  "missing-link-text",
  "missing-iframe-title",
  "missing-fieldset-legend",
  "missing-skip-link"
]);
const AllowedAppliesTo = new Set(["xaml", "cshtml", "razor", "html", "htm", "css"]);

const wcagCriteriaPattern = /^\d+\.\d+\.\d+$/;
const problemTagPattern = /^[a-z0-9-]+$/;

class RuleSchemaValidator {
  validate(rule) {
    const errors = [];
    if (!rule?.id || !rule.id.trim()) {
      errors.push("Rule id is required.");
    }

    if (!rule?.description || !rule.description.trim()) {
      errors.push("Rule description is required.");
    }

    if (!rule?.severity || !AllowedSeverities.has(rule.severity.toLowerCase())) {
      errors.push("Rule severity must be low, medium, or high.");
    }

    if (!rule?.checkId || !AllowedChecks.has(rule.checkId.toLowerCase())) {
      errors.push("Rule check id is invalid or missing.");
    }

    if (rule?.appliesTo) {
      const invalidKinds = rule.appliesTo
        .split(",")
        .map((kind) => kind.trim())
        .filter((kind) => kind && !AllowedAppliesTo.has(kind.toLowerCase()));
      if (invalidKinds.length > 0) {
        errors.push(`Rule appliesTo contains invalid values: ${invalidKinds.join(", ")}.`);
      }
    }

    if (rule?.wcagCriteria) {
      const invalidCriteria = rule.wcagCriteria
        .split(",")
        .map((criteria) => criteria.trim())
        .filter((criteria) => !criteria || !wcagCriteriaPattern.test(criteria));
      if (invalidCriteria.length > 0) {
        errors.push("Rule wcagCriteria must list WCAG success criteria like 1.4.3.");
      }
    }

    if (rule?.problemTags) {
      const invalidTags = rule.problemTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => !tag || !problemTagPattern.test(tag));
      if (invalidTags.length > 0) {
        errors.push("Rule problemTags must be comma-separated slugs like document-language.");
      }
    }

    return errors;
  }
}

module.exports = { RuleSchemaValidator, AllowedChecks, AllowedAppliesTo, AllowedSeverities };
