const { getAttributeValue } = require("./AttributeParser");
const { collectFreemarkerMacros, macroNameMatches } = require("./FreemarkerUtilities");
const { getLineNumber, getLineNumberForSnippet } = require("./TextUtilities");

const imgRegex = /<img(?<attrs>[^>]*)>/gi;

const MissingAltTextCheck = {
  id: "missing-alt-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      for (const image of context.document.querySelectorAll("img")) {
        const alt = image.getAttribute("alt");
        if (alt && alt.trim()) {
          continue;
        }
        const evidence = image.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: MissingAltTextCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Image missing alt text.",
          evidence
        });
      }

      return issues;
    }

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

    for (const macro of collectFreemarkerMacros(context.content)) {
      if (!macroNameMatches(macro.name, ["img", "image"])) {
        continue;
      }
      const alt = getAttributeValue(macro.attrs, "alt");
      if (alt && alt.trim()) {
        continue;
      }
      const line = getLineNumber(context.content, macro.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingAltTextCheck.id,
        filePath: context.filePath,
        line,
        message: "Image missing alt text.",
        evidence: macro.raw
      });
    }

    return issues;
  }
};

module.exports = { MissingAltTextCheck };
