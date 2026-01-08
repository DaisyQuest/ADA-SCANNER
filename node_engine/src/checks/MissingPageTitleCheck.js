const { getLineNumber } = require("./TextUtilities");

const titleRegex = /<\s*title(?<attrs>[^>]*)>(?<content>.*?)<\/\s*title\s*>/gis;

const MissingPageTitleCheck = {
  id: "missing-page-title",
  applicableKinds: ["html", "htm"],
  run(context, rule) {
    const matches = Array.from(context.content.matchAll(titleRegex));
    if (matches.length === 0) {
      return [
        {
          ruleId: rule.id,
          checkId: MissingPageTitleCheck.id,
          filePath: context.filePath,
          line: 1,
          message: "Document title is missing.",
          evidence: context.content
        }
      ];
    }

    const hasContent = matches.some((match) => match.groups.content.trim());
    if (hasContent) {
      return [];
    }

    const emptyMatch = matches[0];
    const line = getLineNumber(context.content, emptyMatch.index);
    return [
      {
        ruleId: rule.id,
        checkId: MissingPageTitleCheck.id,
        filePath: context.filePath,
        line,
        message: "Document title is missing or empty.",
        evidence: emptyMatch[0]
      }
    ];
  }
};

module.exports = { MissingPageTitleCheck };
