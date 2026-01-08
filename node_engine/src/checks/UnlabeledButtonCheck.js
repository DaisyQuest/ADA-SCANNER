const { getAttributeValue } = require("./AttributeParser");
const {
  collectLabelForIds,
  collectLabelRanges,
  collectElementIds,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasLabelForId,
  isWithinLabel,
  hasTextContent
} = require("./AccessibleNameUtilities");
const { getLineNumber } = require("./TextUtilities");

const buttonRegex = /<button(?<attrs>[^>]*)>(?<content>.*?)<\/button>/gis;
const inputRegex = /<input(?<attrs>[^>]*)>/gi;
const buttonInputTypes = new Set(["button", "submit", "reset", "image"]);

const hasButtonLabel = (attributes, content, elementIds, labelForIds, index, labelRanges) => {
  const ariaLabel = getAttributeValue(attributes, "aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = getAttributeValue(attributes, "aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = getAttributeValue(attributes, "title");
  if (hasTitle(title)) {
    return true;
  }

  const id = getAttributeValue(attributes, "id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  if (isWithinLabel(index, labelRanges)) {
    return true;
  }

  return hasTextContent(content);
};

const hasInputButtonLabel = (attributes, type, elementIds, labelForIds, index, labelRanges) => {
  if (type.toLowerCase() === "image") {
    const alt = getAttributeValue(attributes, "alt");
    if (alt && alt.trim()) {
      return true;
    }
  } else {
    const value = getAttributeValue(attributes, "value");
    if (value && value.trim()) {
      return true;
    }
  }

  const ariaLabel = getAttributeValue(attributes, "aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = getAttributeValue(attributes, "aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = getAttributeValue(attributes, "title");
  if (hasTitle(title)) {
    return true;
  }

  const id = getAttributeValue(attributes, "id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  return isWithinLabel(index, labelRanges);
};

const UnlabeledButtonCheck = {
  id: "unlabeled-button",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    const labelForIds = collectLabelForIds(context.content);
    const labelRanges = collectLabelRanges(context.content);
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(buttonRegex)) {
      const attrs = match.groups.attrs;
      const content = match.groups.content;
      if (hasButtonLabel(attrs, content, elementIds, labelForIds, match.index, labelRanges)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: UnlabeledButtonCheck.id,
        filePath: context.filePath,
        line,
        message: "Button missing accessible label.",
        evidence: match[0]
      });
    }

    for (const match of context.content.matchAll(inputRegex)) {
      const attrs = match.groups.attrs;
      const type = getAttributeValue(attrs, "type");
      if (!type || !buttonInputTypes.has(type)) {
        continue;
      }

      if (hasInputButtonLabel(attrs, type, elementIds, labelForIds, match.index, labelRanges)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: UnlabeledButtonCheck.id,
        filePath: context.filePath,
        line,
        message: "Button missing accessible label.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { UnlabeledButtonCheck, hasButtonLabel, hasInputButtonLabel, buttonInputTypes };
