const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, containsAttribute } = require("./TextUtilities");

const anchorRegex = /<a(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/a>/gi;
const focusableRegex = /<(a|button|input|select|textarea|summary)(?<attrs>[^>]*)>/gi;
const tagStripRegex = /<[^>]+>/g;

const normalizeText = (value) =>
  value
    .replace(tagStripRegex, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isSkipLabel = (value) => normalizeText(value).includes("skip");

const isFocusable = (tagName, attrs) => {
  if (containsAttribute(attrs, "disabled", true)) {
    return false;
  }

  const tabindex = getAttributeValue(attrs, "tabindex");
  if (tabindex && Number.parseInt(tabindex, 10) < 0) {
    return false;
  }

  if (tagName === "a") {
    const href = getAttributeValue(attrs, "href");
    if (href && href.trim()) {
      return true;
    }

    return Boolean(tabindex && Number.parseInt(tabindex, 10) >= 0);
  }

  if (tagName === "input") {
    const type = getAttributeValue(attrs, "type");
    if (type && type.toLowerCase() === "hidden") {
      return false;
    }
  }

  return true;
};

const MissingSkipLinkCheck = {
  id: "missing-skip-link",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    let skipLinkIndex = null;
    for (const match of context.content.matchAll(anchorRegex)) {
      const attrs = match.groups?.attrs ?? "";
      const body = match.groups?.body ?? "";
      const href = getAttributeValue(attrs, "href");
      if (!href || !href.trim().startsWith("#")) {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const title = getAttributeValue(attrs, "title");
      const labelSource = ariaLabel || title || body;
      if (!labelSource || !isSkipLabel(labelSource)) {
        continue;
      }

      if (skipLinkIndex === null || match.index < skipLinkIndex) {
        skipLinkIndex = match.index;
      }
    }

    let firstFocusable = null;
    for (const match of context.content.matchAll(focusableRegex)) {
      const tagName = match[1].toLowerCase();
      const attrs = match.groups?.attrs ?? "";
      if (!isFocusable(tagName, attrs)) {
        continue;
      }

      firstFocusable = match;
      break;
    }

    if (skipLinkIndex === null) {
      return [
        {
          ruleId: rule.id,
          checkId: MissingSkipLinkCheck.id,
          filePath: context.filePath,
          line: 1,
          message: "Skip link is missing from the document.",
          evidence: context.content
        }
      ];
    }

    if (firstFocusable && skipLinkIndex > firstFocusable.index) {
      const line = getLineNumber(context.content, firstFocusable.index);
      return [
        {
          ruleId: rule.id,
          checkId: MissingSkipLinkCheck.id,
          filePath: context.filePath,
          line,
          message: "Skip link is not the first focusable element.",
          evidence: firstFocusable[0]
        }
      ];
    }

    return [];
  }
};

module.exports = { MissingSkipLinkCheck, normalizeText, isSkipLabel, isFocusable };
