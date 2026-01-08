const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { collectElementIds, hasAriaLabel, hasValidAriaLabelledBy, hasTitle, hasTextContent } = require("./AccessibleNameUtilities");

const linkRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
const imageRegex = /<img([^>]*)>/gi;

const hasImageAltText = (body) => {
  for (const match of body.matchAll(imageRegex)) {
    const alt = getAttributeValue(match[1], "alt");
    if (alt && alt.trim()) {
      return true;
    }
  }

  return false;
};

const MissingLinkTextCheck = {
  id: "missing-link-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(linkRegex)) {
      const attrs = match[1];
      const body = match[2];

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const labelledBy = getAttributeValue(attrs, "aria-labelledby");
      const title = getAttributeValue(attrs, "title");

      const hasAccessibleLabel =
        hasAriaLabel(ariaLabel) ||
        hasValidAriaLabelledBy(labelledBy, elementIds) ||
        hasTitle(title) ||
        hasTextContent(body) ||
        hasImageAltText(body);

      if (!hasAccessibleLabel) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: MissingLinkTextCheck.id,
          filePath: context.filePath,
          line,
          message: "Link missing accessible text.",
          evidence: match[0]
        });
      }
    }

    return issues;
  }
};

module.exports = { MissingLinkTextCheck, hasImageAltText };
