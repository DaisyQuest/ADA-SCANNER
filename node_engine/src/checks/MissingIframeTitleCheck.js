const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const iframeRegex = /<iframe(?<attrs>[^>]*)>/gi;

const MissingIframeTitleCheck = {
  id: "missing-iframe-title",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(iframeRegex)) {
      const attrs = match.groups?.attrs ?? "";
      const title = getAttributeValue(attrs, "title");
      if (title && title.trim()) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingIframeTitleCheck.id,
        filePath: context.filePath,
        line,
        message: "Iframe missing title attribute.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingIframeTitleCheck };
