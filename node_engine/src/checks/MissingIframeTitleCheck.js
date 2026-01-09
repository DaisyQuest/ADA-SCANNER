const { getAttributeValue } = require("./AttributeParser");
const { collectFreemarkerMacros, macroNameMatches } = require("./FreemarkerUtilities");
const { getLineNumber, getLineNumberForSnippet } = require("./TextUtilities");

const iframeRegex = /<iframe\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/?>/gi;

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

    if (context.document?.querySelectorAll) {
      for (const iframe of context.document.querySelectorAll("iframe")) {
        const title = iframe.getAttribute("title");
        if (title && title.trim()) {
          continue;
        }
        const evidence = iframe.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: MissingIframeTitleCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Iframe missing title attribute.",
          evidence
        });
      }

      return issues;
    }

    for (const match of context.content.matchAll(iframeRegex)) {
      recordIssue(match);
    }

    for (const macro of collectFreemarkerMacros(context.content)) {
      if (!macroNameMatches(macro.name, ["iframe"])) {
        continue;
      }
      recordIssue({
        groups: { attrs: macro.attrs },
        index: macro.index,
        0: macro.raw
      });
    }

    return issues;
  }
};

module.exports = { MissingIframeTitleCheck };
