const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { getLastPropertyValue, isFixedLength } = require("./StyleUtilities");

const tagRegex = /<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>/gi;
const styleWidthProperties = ["width", "min-width"];

const isFixedWidthValue = (value) => {
  if (!value || !value.trim()) {
    return false;
  }

  if (value.toLowerCase() === "auto") {
    return false;
  }

  if (value.includes("*")) {
    return false;
  }

  const parsed = Number.parseFloat(value);
  return !Number.isNaN(parsed) && parsed > 0;
};

const tryGetFixedStyleWidth = (style) => {
  for (const property of styleWidthProperties) {
    const value = getLastPropertyValue(style, property);
    if (value && isFixedLength(value)) {
      return { propertyName: property, propertyValue: value };
    }
  }

  return null;
};

const isFixedMarkupLength = (value) => {
  if (!value || !value.trim()) {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return false;
  }

  if (isFixedLength(trimmed)) {
    return true;
  }

  const parsed = Number.parseFloat(trimmed);
  return !Number.isNaN(parsed) && parsed > 0;
};

const describeProperty = (propertyName) =>
  propertyName.toLowerCase() === "min-width" ? "minimum width" : "width";

const runMarkup = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const style = getAttributeValue(attrs, "style");
    const fixedStyle = tryGetFixedStyleWidth(style);
    if (fixedStyle) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `Element uses fixed ${describeProperty(fixedStyle.propertyName)} (${fixedStyle.propertyName}: ${fixedStyle.propertyValue}).`,
        evidence: match[0]
      });
      continue;
    }

    const widthAttribute = getAttributeValue(attrs, "width");
    if (!isFixedMarkupLength(widthAttribute)) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: FixedWidthLayoutCheck.id,
      filePath: context.filePath,
      line,
      message: `Element uses a fixed width attribute (width="${widthAttribute}").`,
      evidence: match[0]
    });
  }

  return issues;
};

const runXaml = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const widthValue = getAttributeValue(attrs, "Width");
    if (isFixedWidthValue(widthValue)) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `XAML element uses fixed width (Width="${widthValue}").`,
        evidence: match[0]
      });
      continue;
    }

    const minWidthValue = getAttributeValue(attrs, "MinWidth");
    if (!isFixedWidthValue(minWidthValue)) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: FixedWidthLayoutCheck.id,
      filePath: context.filePath,
      line,
      message: `XAML element uses fixed minimum width (MinWidth="${minWidthValue}").`,
      evidence: match[0]
    });
  }

  return issues;
};

const FixedWidthLayoutCheck = {
  id: "fixed-width-layout",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml"],
  run(context, rule) {
    if (context.kind.toLowerCase() === "xaml") {
      return runXaml(context, rule);
    }

    return runMarkup(context, rule);
  }
};

module.exports = {
  FixedWidthLayoutCheck,
  isFixedWidthValue,
  tryGetFixedStyleWidth,
  isFixedMarkupLength,
  describeProperty
};
