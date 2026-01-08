const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, containsAttribute } = require("./TextUtilities");
const {
  collectElementIds,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasTextContent
} = require("./AccessibleNameUtilities");

const linkRegex = /<a(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/a>/gi;

const isLink = (attributes) => {
  if (containsAttribute(attributes, "href")) {
    return true;
  }

  const role = getAttributeValue(attributes, "role");
  return role && role.toLowerCase() === "link";
};

const EmptyLinkCheck = {
  id: "empty-link",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(linkRegex)) {
      const attrs = match.groups?.attrs ?? "";
      if (!isLink(attrs)) {
        continue;
      }

      const content = match.groups?.content ?? "";
      if (hasTextContent(content)) {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      if (hasAriaLabel(ariaLabel)) {
        continue;
      }

      const labelledBy = getAttributeValue(attrs, "aria-labelledby");
      if (hasValidAriaLabelledBy(labelledBy, elementIds)) {
        continue;
      }

      const title = getAttributeValue(attrs, "title");
      if (hasTitle(title)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: EmptyLinkCheck.id,
        filePath: context.filePath,
        line,
        message: "Link has no accessible name.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { EmptyLinkCheck, isLink };
