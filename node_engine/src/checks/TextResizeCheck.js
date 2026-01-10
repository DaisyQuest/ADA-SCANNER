const { getLineNumber } = require("./TextUtilities");

const resizePatterns = [
  /text-size-adjust\s*:\s*none/i,
  /-webkit-text-size-adjust\s*:\s*none/i,
  /-ms-text-size-adjust\s*:\s*none/i
];

const TextResizeCheck = {
  id: "text-resize-restriction",
  applicableKinds: ["html", "htm", "cshtml", "razor", "css"],
  run(context, rule) {
    const issues = [];
    for (const pattern of resizePatterns) {
      const match = context.content.match(pattern);
      if (!match) {
        continue;
      }
      const index = context.content.search(pattern);
      issues.push({
        ruleId: rule.id,
        checkId: TextResizeCheck.id,
        filePath: context.filePath,
        line: getLineNumber(context.content, Math.max(index, 0)),
        message: "Text resizing appears to be disabled via text-size-adjust.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { TextResizeCheck };
