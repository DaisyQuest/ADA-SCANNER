const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, containsAttribute } = require("./TextUtilities");

const tagRegex = /<\s*(?<closing>\/)?\s*(?<name>[a-zA-Z0-9:-]+)(?<attrs>[^>]*?)(?<self>\/?)>/gi;
const styleWhitespaceRegex = /\s+/g;

const voidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);

const isXamlContext = (context) => context.kind.toLowerCase() === "xaml";

const isSelfClosing = (match, name, context) => {
  if (match.groups.self === "/") {
    return true;
  }

  return !isXamlContext(context) && voidElements.has(name.toLowerCase());
};

const hasHiddenStyle = (style) => {
  if (!style || !style.trim()) {
    return false;
  }

  const normalized = style.replace(styleWhitespaceRegex, "");
  return normalized.toLowerCase().includes("display:none") || normalized.toLowerCase().includes("visibility:hidden");
};

const isHtmlHidden = (attrs) => {
  const ariaHidden = getAttributeValue(attrs, "aria-hidden");
  const style = getAttributeValue(attrs, "style") ?? "";
  const hasHidden = containsAttribute(attrs, "hidden", true);

  return (ariaHidden && ariaHidden.toLowerCase() === "true") || hasHiddenStyle(style) || hasHidden;
};

const isXamlHidden = (attrs) => {
  const visibility = getAttributeValue(attrs, "Visibility");
  return visibility && ["collapsed", "hidden"].includes(visibility.toLowerCase());
};

const isNegativeTabIndex = (value) => {
  const parsed = Number.parseInt(value, 10);
  return !Number.isNaN(parsed) && parsed < 0;
};

const isHtmlFocusable = (name, attrs) => {
  const tabindex = getAttributeValue(attrs, "tabindex");
  if (tabindex && tabindex.trim()) {
    return !isNegativeTabIndex(tabindex);
  }

  if (containsAttribute(attrs, "disabled", true)) {
    return false;
  }

  if (name.toLowerCase() === "a") {
    const href = getAttributeValue(attrs, "href");
    return Boolean(href && href.trim());
  }

  if (name.toLowerCase() === "input") {
    const type = getAttributeValue(attrs, "type");
    return !type || type.toLowerCase() !== "hidden";
  }

  return ["button", "select", "textarea"].includes(name.toLowerCase());
};

const isXamlFocusable = (attrs) => {
  const isTabStop = getAttributeValue(attrs, "IsTabStop");
  if (isTabStop && isTabStop.toLowerCase() === "false") {
    return false;
  }

  const tabIndex = getAttributeValue(attrs, "TabIndex");
  if (tabIndex && tabIndex.trim()) {
    return !isNegativeTabIndex(tabIndex);
  }

  return isTabStop && isTabStop.toLowerCase() === "true";
};

const isHtmlReferenced = (attrs, referencedIds) => {
  const id = getAttributeValue(attrs, "id");
  return Boolean(id && referencedIds.has(id.toLowerCase()));
};

const collectReferencedIds = (content) => {
  const ids = new Set();
  for (const match of content.matchAll(tagRegex)) {
    if (match.groups.closing) {
      continue;
    }

    const attrs = match.groups.attrs;
    const href = getAttributeValue(attrs, "href");
    if (href && href.startsWith("#")) {
      ids.add(href.slice(1).toLowerCase());
    }

    const ariaControls = getAttributeValue(attrs, "aria-controls");
    if (ariaControls && ariaControls.trim()) {
      for (const id of ariaControls.split(" ").map((token) => token.trim()).filter(Boolean)) {
        ids.add(id.toLowerCase());
      }
    }
  }

  return ids;
};

const HiddenFocusableElementCheck = {
  id: "hidden-focusable",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml"],
  run(context, rule) {
    const referencedIds = isXamlContext(context) ? new Set() : collectReferencedIds(context.content);
    const hiddenStack = [];
    const issues = [];

    for (const match of context.content.matchAll(tagRegex)) {
      if (match.groups.closing) {
        if (hiddenStack.length > 0) {
          hiddenStack.pop();
        }
        continue;
      }

      const name = match.groups.name;
      const attrs = match.groups.attrs;
      const parentHidden = hiddenStack.length > 0 && hiddenStack[hiddenStack.length - 1];
      const isHidden = parentHidden || (isXamlContext(context) ? isXamlHidden(attrs) : isHtmlHidden(attrs));
      const isFocusable = isXamlContext(context) ? isXamlFocusable(attrs) : isHtmlFocusable(name, attrs);
      const isReferenced = !isXamlContext(context) && isHtmlReferenced(attrs, referencedIds);

      if (isHidden && (isFocusable || isReferenced)) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: HiddenFocusableElementCheck.id,
          filePath: context.filePath,
          line,
          message: "Hidden element remains focusable or referenced by navigation.",
          evidence: match[0]
        });
      }

      if (!isSelfClosing(match, name, context)) {
        hiddenStack.push(isHidden);
      }
    }

    return issues;
  }
};

module.exports = {
  HiddenFocusableElementCheck,
  collectReferencedIds,
  isHtmlFocusable,
  isXamlFocusable,
  isHtmlHidden,
  isXamlHidden,
  isSelfClosing,
  isHtmlReferenced,
  isNegativeTabIndex,
  hasHiddenStyle
};
