const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { getLastPropertyValue } = require("./StyleUtilities");

const tagRegex = /<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>/gi;
const canvasAttributes = [
  "Canvas.Left",
  "Canvas.Top",
  "Canvas.Right",
  "Canvas.Bottom",
  "AbsoluteLayout.LayoutBounds"
];
const positioningValues = ["absolute", "fixed"];

const isAbsolutePositioningValue = (value) =>
  Boolean(value && positioningValues.some((position) => position.toLowerCase() === value.toLowerCase()));

const tryGetCanvasPositioning = (attrs) => {
  for (const attribute of canvasAttributes) {
    const value = getAttributeValue(attrs, attribute);
    if (value && value.trim()) {
      return { attributeName: attribute, attributeValue: value };
    }
  }

  return null;
};

const runMarkup = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const style = getAttributeValue(attrs, "style");
    const position = getLastPropertyValue(style, "position");
    if (!isAbsolutePositioningValue(position)) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: AbsolutePositioningCheck.id,
      filePath: context.filePath,
      line,
      message: `Element uses position: ${position}.`,
      evidence: match[0]
    });
  }

  return issues;
};

const runXaml = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const canvas = tryGetCanvasPositioning(attrs);
    if (!canvas) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: AbsolutePositioningCheck.id,
      filePath: context.filePath,
      line,
      message: `XAML element uses absolute positioning (${canvas.attributeName}="${canvas.attributeValue}").`,
      evidence: match[0]
    });
  }

  return issues;
};

const AbsolutePositioningCheck = {
  id: "absolute-positioning",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml"],
  run(context, rule) {
    if (context.kind.toLowerCase() === "xaml") {
      return runXaml(context, rule);
    }

    return runMarkup(context, rule);
  }
};

module.exports = { AbsolutePositioningCheck, isAbsolutePositioningValue, tryGetCanvasPositioning };
