const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const iframeRegex = /<iframe\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/?>/gi;
const freemarkerMacroRegex = /<@(?<name>[\w.-]+)\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/?>/gi;

const MissingIframeTitleCheck = {
  id: "missing-iframe-title",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    const recordIssue = (match) => {
      const attrs = match.groups?.attrs ?? "";
      const title = getAttributeValue(attrs, "title");
      if (title && title.trim()) {
        return;
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
    };

    for (const match of context.content.matchAll(iframeRegex)) {
      recordIssue(match);
    }

    for (const match of context.content.matchAll(freemarkerMacroRegex)) {
      const macroName = match.groups?.name?.toLowerCase() ?? "";
      if (macroName !== "iframe" && !macroName.endsWith(".iframe")) {
        continue;
      }
      recordIssue(match);
    }

    return issues;
  }
};

module.exports = { MissingIframeTitleCheck };
