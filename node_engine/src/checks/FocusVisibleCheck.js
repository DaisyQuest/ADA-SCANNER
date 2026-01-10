const { getLineNumber } = require("./TextUtilities");

const focusPattern = /:focus[^\{]*\{[^}]*\b(outline|box-shadow)\s*:\s*(none|0)/i;

const FocusVisibleCheck = {
  id: "focus-visible",
  applicableKinds: ["html", "htm", "cshtml", "razor", "css"],
  run(context, rule) {
    const issues = [];
    const match = context.content.match(focusPattern);
    if (!match) {
      return issues;
    }

    const index = context.content.search(focusPattern);
    issues.push({
      ruleId: rule.id,
      checkId: FocusVisibleCheck.id,
      filePath: context.filePath,
      line: getLineNumber(context.content, Math.max(index, 0)),
      message: "Focus indicators appear to be removed; ensure focus remains visible.",
      evidence: match[0]
    });

    return issues;
  }
};

module.exports = { FocusVisibleCheck };
