const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { getLastPropertyValue, isFixedLength } = require("./StyleUtilities");

const tagRegex = /<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>/gi;
const styleWidthProperties = ["width", "min-width"];
const styleHeightProperties = ["height", "min-height"];
const MIN_VIEWPORT_WIDTH_PX = 320;
const MIN_VIEWPORT_HEIGHT_PX = 256;
const BASE_FONT_SIZE_PX = 16;

const lengthRegex = /^(?<value>-?\d+(?:\.\d+)?)(?<unit>px|pt|pc|cm|mm|in|em|rem)?$/i;

const isFixedDimensionValue = (value, minPx) => {
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
  return !Number.isNaN(parsed) && parsed > minPx;
};

const isFixedWidthValue = (value) => isFixedDimensionValue(value, MIN_VIEWPORT_WIDTH_PX);

const convertToPx = (number, unit) => {
  switch (unit) {
    case "px":
      return number;
    case "pt":
      return (number * 96) / 72;
    case "pc":
      return number * 16;
    case "in":
      return number * 96;
    case "cm":
      return (number * 96) / 2.54;
    case "mm":
      return (number * 96) / 25.4;
    case "em":
    case "rem":
      return number * BASE_FONT_SIZE_PX;
    default:
      return null;
  }
};

const parseFixedLengthToPx = (value, { assumePixels = false } = {}) => {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    return null;
  }

  if (isFixedLength(trimmed)) {
    const match = lengthRegex.exec(trimmed);
    if (!match) {
      return null;
    }

    const number = Number.parseFloat(match.groups.value);
    if (Number.isNaN(number) || number <= 0) {
      return null;
    }

    const unit = match.groups.unit ? match.groups.unit.toLowerCase() : null;
    const unitToUse = unit ?? (assumePixels ? "px" : null);
    if (!unitToUse) {
      return null;
    }

    return convertToPx(number, unitToUse);
  }

  const parsed = Number.parseFloat(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  if (assumePixels) {
    return parsed;
  }

  return null;
};

const isFixedLengthAtLeast = (value, minPx, options) => {
  const size = parseFixedLengthToPx(value, options);
  if (size == null) {
    return false;
  }

  return size > minPx;
};

const tryGetFixedStyleDimension = (style, properties, minPx) => {
  for (const property of properties) {
    const value = getLastPropertyValue(style, property);
    if (!value) {
      continue;
    }

    const size = parseFixedLengthToPx(value);
    if (size != null && size > minPx) {
      return { propertyName: property, propertyValue: value, pixelValue: size };
    }
  }

  return null;
};

const tryGetFixedStyleWidth = (style) => tryGetFixedStyleDimension(style, styleWidthProperties, MIN_VIEWPORT_WIDTH_PX);
const tryGetFixedStyleHeight = (style) => tryGetFixedStyleDimension(style, styleHeightProperties, MIN_VIEWPORT_HEIGHT_PX);

const isFixedMarkupLength = (value, { minPx = 0, assumePixels = true } = {}) =>
  isFixedLengthAtLeast(value, minPx, { assumePixels });

const describeProperty = (propertyName) => {
  const normalized = propertyName.toLowerCase();
  if (normalized === "min-width") {
    return "minimum width";
  }
  if (normalized === "min-height") {
    return "minimum height";
  }
  return normalized.includes("height") ? "height" : "width";
};

const runMarkup = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const style = getAttributeValue(attrs, "style");
    const fixedStyleWidth = tryGetFixedStyleWidth(style);
    if (fixedStyleWidth) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `Element uses fixed ${describeProperty(fixedStyleWidth.propertyName)} (${fixedStyleWidth.propertyName}: ${fixedStyleWidth.propertyValue}).`,
        evidence: match[0]
      });
      continue;
    }

    const fixedStyleHeight = tryGetFixedStyleHeight(style);
    if (fixedStyleHeight) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `Element uses fixed ${describeProperty(fixedStyleHeight.propertyName)} (${fixedStyleHeight.propertyName}: ${fixedStyleHeight.propertyValue}).`,
        evidence: match[0]
      });
      continue;
    }

    const widthAttribute = getAttributeValue(attrs, "width");
    if (isFixedMarkupLength(widthAttribute, { minPx: MIN_VIEWPORT_WIDTH_PX })) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `Element uses a fixed width attribute (width="${widthAttribute}").`,
        evidence: match[0]
      });
      continue;
    }

    const heightAttribute = getAttributeValue(attrs, "height");
    if (isFixedMarkupLength(heightAttribute, { minPx: MIN_VIEWPORT_HEIGHT_PX })) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `Element uses a fixed height attribute (height="${heightAttribute}").`,
        evidence: match[0]
      });
    }
  }

  return issues;
};

const runXaml = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const widthValue = getAttributeValue(attrs, "Width");
    if (isFixedDimensionValue(widthValue, MIN_VIEWPORT_WIDTH_PX)) {
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
    if (isFixedDimensionValue(minWidthValue, MIN_VIEWPORT_WIDTH_PX)) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `XAML element uses fixed minimum width (MinWidth="${minWidthValue}").`,
        evidence: match[0]
      });
      continue;
    }

    const heightValue = getAttributeValue(attrs, "Height");
    if (isFixedDimensionValue(heightValue, MIN_VIEWPORT_HEIGHT_PX)) {
      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: FixedWidthLayoutCheck.id,
        filePath: context.filePath,
        line,
        message: `XAML element uses fixed height (Height="${heightValue}").`,
        evidence: match[0]
      });
      continue;
    }

    const minHeightValue = getAttributeValue(attrs, "MinHeight");
    if (!isFixedDimensionValue(minHeightValue, MIN_VIEWPORT_HEIGHT_PX)) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: FixedWidthLayoutCheck.id,
      filePath: context.filePath,
      line,
      message: `XAML element uses fixed minimum height (MinHeight="${minHeightValue}").`,
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
  isFixedDimensionValue,
  isFixedWidthValue,
  tryGetFixedStyleWidth,
  tryGetFixedStyleHeight,
  isFixedMarkupLength,
  parseFixedLengthToPx,
  isFixedLengthAtLeast,
  describeProperty,
  MIN_VIEWPORT_WIDTH_PX,
  MIN_VIEWPORT_HEIGHT_PX
};
