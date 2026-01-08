const { getLineNumber } = require("./TextUtilities");
const { hasTextContent } = require("./AccessibleNameUtilities");

const fieldsetRegex = /<fieldset(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/fieldset>/gi;
const legendRegex = /<legend[^>]*>(?<body>[\s\S]*?)<\/legend>/i;

const MissingFieldsetLegendCheck = {
  id: "missing-fieldset-legend",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(fieldsetRegex)) {
      const body = match.groups?.body ?? "";
      const legendMatch = legendRegex.exec(body);
      const legendBody = legendMatch?.groups?.body ?? "";
      if (legendMatch && hasTextContent(legendBody)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingFieldsetLegendCheck.id,
        filePath: context.filePath,
        line,
        message: "Fieldset missing descriptive legend.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingFieldsetLegendCheck };
