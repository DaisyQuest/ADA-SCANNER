const { getLineNumber } = require("./TextUtilities");
const { collectElementIds } = require("./AccessibleNameUtilities");

const labelForRegex = /<label[^>]*for="(?<id>[^"]+)"[^>]*>/gi;

const OrphanedFormLabelCheck = {
  id: "orphaned-form-label",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(labelForRegex)) {
      const id = match.groups?.id ?? "";
      if (!id.trim()) {
        continue;
      }

      if (elementIds.has(id.toLowerCase())) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: OrphanedFormLabelCheck.id,
        filePath: context.filePath,
        line,
        message: "Form label references a missing control.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { OrphanedFormLabelCheck };
