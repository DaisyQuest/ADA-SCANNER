const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const tableRegex = /<table(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/table>/gi;
const headerRegex = /<th\b/i;
const captionRegex = /<caption\b/i;

const LayoutTableCheck = {
  id: "layout-table",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(tableRegex)) {
      const { attrs, content } = match.groups;
      const role = getAttributeValue(attrs, "role");
      const normalizedRole = role ? role.toLowerCase() : "";
      if (normalizedRole === "presentation" || normalizedRole === "none") {
        continue;
      }

      if (headerRegex.test(content) || captionRegex.test(content)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: LayoutTableCheck.id,
        filePath: context.filePath,
        line,
        message: "Table appears to be used for layout.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { LayoutTableCheck };
