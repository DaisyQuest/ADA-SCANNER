const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const imgRegex = /<img(?<attrs>[^>]*)>/gi;

const MissingAltTextCheck = {
  id: "missing-alt-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(imgRegex)) {
      const attrs = match.groups.attrs;
      const alt = getAttributeValue(attrs, "alt");
      if (alt && alt.trim()) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingAltTextCheck.id,
        filePath: context.filePath,
        line,
        message: "Image missing alt text.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingAltTextCheck };
