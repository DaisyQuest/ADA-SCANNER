const { getLineNumber } = require("./TextUtilities");

const spacingPattern = /(line-height|letter-spacing|word-spacing)\s*:\s*[^;]+!important/i;
const nowrapPattern = /white-space\s*:\s*nowrap/i;

const TextSpacingCheck = {
  id: "text-spacing",
  applicableKinds: ["html", "htm", "cshtml", "razor", "css"],
  run(context, rule) {
    const issues = [];
    const spacingMatch = context.content.match(spacingPattern);
    if (spacingMatch) {
      const index = context.content.search(spacingPattern);
      issues.push({
        ruleId: rule.id,
        checkId: TextSpacingCheck.id,
        filePath: context.filePath,
        line: getLineNumber(context.content, Math.max(index, 0)),
        message: "Text spacing overrides may block user adjustments.",
        evidence: spacingMatch[0]
      });
    }

    const nowrapMatch = context.content.match(nowrapPattern);
    if (nowrapMatch) {
      const index = context.content.search(nowrapPattern);
      issues.push({
        ruleId: rule.id,
        checkId: TextSpacingCheck.id,
        filePath: context.filePath,
        line: getLineNumber(context.content, Math.max(index, 0)),
        message: "Text wrapping is disabled; verify spacing adjustments remain usable.",
        evidence: nowrapMatch[0]
      });
    }

    return issues;
  }
};

module.exports = { TextSpacingCheck };
