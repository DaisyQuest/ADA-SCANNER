const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { hasTitle } = require("./AccessibleNameUtilities");

const elementRegex = /<(?<tag>[a-z0-9]+)(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/\k<tag>>/gi;
const tagRegex = /<[^>]+>/g;
const whitespaceRegex = /\s+/g;

const normalize = (value) => value.replace(whitespaceRegex, " ").trim();

const textMatches = (normalizedTitle, value) => {
  if (!value || !value.trim()) {
    return false;
  }

  return normalizedTitle.toLowerCase() === normalize(value).toLowerCase();
};

const RedundantTitleTextCheck = {
  id: "redundant-title-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(elementRegex)) {
      const attrs = match.groups?.attrs ?? "";
      const title = getAttributeValue(attrs, "title");
      if (!hasTitle(title)) {
        continue;
      }

      const normalizedTitle = normalize(title);
      if (!normalizedTitle) {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      if (textMatches(normalizedTitle, ariaLabel)) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: RedundantTitleTextCheck.id,
          filePath: context.filePath,
          line,
          message: "Title text duplicates existing accessible text.",
          evidence: match[0]
        });
        continue;
      }

      const textContent = (match.groups?.content ?? "").replace(tagRegex, "");
      if (textMatches(normalizedTitle, textContent)) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: RedundantTitleTextCheck.id,
          filePath: context.filePath,
          line,
          message: "Title text duplicates existing accessible text.",
          evidence: match[0]
        });
      }
    }

    return issues;
  }
};

module.exports = { RedundantTitleTextCheck, normalize, textMatches };
