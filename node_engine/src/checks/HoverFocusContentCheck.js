const { getLineNumber } = require("./TextUtilities");

const hoverFocusPattern = /:(hover|focus)[^{]*\{[^}]*\b(display|visibility|opacity)\s*:/i;

const HoverFocusContentCheck = {
  id: "hover-focus-content",
  applicableKinds: ["html", "htm", "cshtml", "razor", "css"],
  run(context, rule) {
    const issues = [];
    const match = context.content.match(hoverFocusPattern);
    if (!match) {
      return issues;
    }

    const index = context.content.search(hoverFocusPattern);
    issues.push({
      ruleId: rule.id,
      checkId: HoverFocusContentCheck.id,
      filePath: context.filePath,
      line: getLineNumber(context.content, Math.max(index, 0)),
      message: "Hover/focus styles reveal content; ensure it remains accessible and dismissible.",
      evidence: match[0]
    });

    return issues;
  }
};

module.exports = { HoverFocusContentCheck };
