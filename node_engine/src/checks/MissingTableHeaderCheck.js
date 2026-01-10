const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const tableRegex = /<table(?<attrs>[^>]*)>(?<content>.*?)<\/table>/gis;
const headerRegex = /<th\b/i;

const MissingTableHeaderCheck = {
  id: "missing-table-headers",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      let searchStart = 0;
      for (const table of context.document.querySelectorAll("table")) {
        const role = table.getAttribute("role");
        const normalizedRole = role ? role.toLowerCase() : "";
        if (["presentation", "none"].includes(normalizedRole)) {
          continue;
        }

        if (table.querySelector("th")) {
          continue;
        }

        const evidence = table.outerHTML;
        const matchIndex = context.content.indexOf(evidence, searchStart);
        issues.push({
          ruleId: rule.id,
          checkId: MissingTableHeaderCheck.id,
          filePath: context.filePath,
          line: getLineNumber(context.content, matchIndex >= 0 ? matchIndex : searchStart),
          message: "Table missing header cells.",
          evidence
        });
        if (matchIndex >= 0) {
          searchStart = matchIndex + evidence.length;
        }
      }

      return issues;
    }

    for (const match of context.content.matchAll(tableRegex)) {
      const attrs = match.groups.attrs;
      const role = getAttributeValue(attrs, "role");
      const normalizedRole = role ? role.toLowerCase() : "";
      if (["presentation", "none"].includes(normalizedRole)) {
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
