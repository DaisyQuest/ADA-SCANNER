const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");
const { getLastPropertyValue } = require("./StyleUtilities");

const tagRegex = /<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>/gi;
const nonWrappingValues = ["nowrap", "pre"];

const isNonWrappingValue = (value) =>
  Boolean(value && nonWrappingValues.some((candidate) => candidate.toLowerCase() === value.toLowerCase()));

const runMarkup = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const style = getAttributeValue(attrs, "style");
    const whiteSpace = getLastPropertyValue(style, "white-space");
    if (!isNonWrappingValue(whiteSpace)) {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: NonWrappingContainerCheck.id,
      filePath: context.filePath,
      line,
      message: `Element prevents text wrapping (white-space: ${whiteSpace}).`,
      evidence: match[0]
    });
  }

  return issues;
};

const runXaml = (context, rule) => {
  const issues = [];
  for (const match of context.content.matchAll(tagRegex)) {
    const attrs = match.groups.attrs;
    const wrapping = getAttributeValue(attrs, "TextWrapping");
    if (!wrapping || wrapping.toLowerCase() !== "nowrap") {
      continue;
    }

    const line = getLineNumber(context.content, match.index);
    issues.push({
      ruleId: rule.id,
      checkId: NonWrappingContainerCheck.id,
      filePath: context.filePath,
      line,
      message: "XAML element disables text wrapping (TextWrapping=\"NoWrap\").",
      evidence: match[0]
    });
  }

  return issues;
};

const NonWrappingContainerCheck = {
  id: "non-wrapping-container",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml"],
  run(context, rule) {
    if (context.kind.toLowerCase() === "xaml") {
      return runXaml(context, rule);
    }

    return runMarkup(context, rule);
  }
};

module.exports = { NonWrappingContainerCheck, isNonWrappingValue };
