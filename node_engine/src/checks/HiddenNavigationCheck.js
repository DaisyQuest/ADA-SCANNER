const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, containsAttribute } = require("./TextUtilities");

const navRegex = /<nav(?<attrs>[^>]*)>/gi;
const styleWhitespaceRegex = /\s+/g;

const hasHiddenStyle = (style) => {
  if (!style || !style.trim()) {
    return false;
  }

  const normalized = style.replace(styleWhitespaceRegex, "");
  return normalized.toLowerCase().includes("display:none") || normalized.toLowerCase().includes("visibility:hidden");
};

const HiddenNavigationCheck = {
  id: "hidden-navigation",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(navRegex)) {
      const attrs = match.groups.attrs;
      const ariaHidden = getAttributeValue(attrs, "aria-hidden");
      const style = getAttributeValue(attrs, "style") ?? "";
      const hasHidden = containsAttribute(attrs, "hidden", true);

      if ((ariaHidden && ariaHidden.toLowerCase() === "true") || hasHiddenStyle(style) || hasHidden) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: HiddenNavigationCheck.id,
          filePath: context.filePath,
          line,
          message: "Navigation element is hidden from assistive tech.",
          evidence: match[0]
        });
      }
    }

    return issues;
  }
};

module.exports = { HiddenNavigationCheck, hasHiddenStyle };
