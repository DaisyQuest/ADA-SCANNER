const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const {
  collectElementIds,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasTextContent
} = require("./AccessibleNameUtilities");

const labelRegex = /<label(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/label>/gi;

const EmptyFormLabelCheck = {
  id: "empty-form-label",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(labelRegex)) {
      const attrs = match.groups?.attrs ?? "";
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
        checkId: EmptyFormLabelCheck.id,
        filePath: context.filePath,
        line,
        message: "Form label has no readable text.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { EmptyFormLabelCheck };
