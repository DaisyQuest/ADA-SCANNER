const { getLineNumber } = require("./TextUtilities");

const langHintRegex = /<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>/gi;
const dataLangPattern = /(data-lang|data-language)=/i;
const langAttributePattern = /(^|\s)lang\s*=/i;

const LanguageOfPartsCheck = {
  id: "language-of-parts",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(langHintRegex)) {
      const attrs = match.groups.attrs;
      if (!dataLangPattern.test(attrs)) {
        continue;
      }
      if (langAttributePattern.test(attrs)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: LanguageOfPartsCheck.id,
        filePath: context.filePath,
        line,
        message: "Element declares language metadata without a lang attribute.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { LanguageOfPartsCheck };
