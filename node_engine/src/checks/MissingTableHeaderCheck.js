const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const tableRegex = /<table(?<attrs>[^>]*)>(?<content>.*?)<\/table>/gis;
const headerRegex = /<th\b/i;

const MissingTableHeaderCheck = {
  id: "missing-table-headers",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(tableRegex)) {
      const attrs = match.groups.attrs;
      const role = getAttributeValue(attrs, "role");
      if (role && ["presentation", "none"].includes(role.toLowerCase())) {
        continue;
      }

      const content = match.groups.content;
      if (headerRegex.test(content)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingTableHeaderCheck.id,
        filePath: context.filePath,
        line,
        message: "Table missing header cells.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingTableHeaderCheck };
