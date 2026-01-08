const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { hasTextContent } = require("./AccessibleNameUtilities");

const headingRegex = /<h[1-6](?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/h[1-6]>/gi;
const imageRegex = /<img(?<attrs>[^>]*)>/gi;

const hasImageAltText = (content) => {
  for (const match of content.matchAll(imageRegex)) {
    const alt = getAttributeValue(match.groups.attrs, "alt");
    if (alt && alt.trim()) {
      return true;
    }
  }

  return false;
};

const EmptyHeadingCheck = {
  id: "empty-heading",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(headingRegex)) {
      const content = match.groups.content;
      if (hasTextContent(content) || hasImageAltText(content)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: EmptyHeadingCheck.id,
        filePath: context.filePath,
        line,
        message: "Heading contains no content.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { EmptyHeadingCheck, hasImageAltText };
