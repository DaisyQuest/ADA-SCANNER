const { getAttributeValue } = require("./AttributeParser");
const { collectFreemarkerMacros, macroNameMatches } = require("./FreemarkerUtilities");
const { getLineNumber, getLineNumberForSnippet, containsAttribute } = require("./TextUtilities");

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

const isFocusableElement = (element) => {
  const tagName = element.tagName.toLowerCase();
  if (element.hasAttribute("disabled")) {
    return false;
  }

  const tabindex = element.getAttribute("tabindex");
  if (tabindex && Number.parseInt(tabindex, 10) < 0) {
    return false;
  }

  if (tagName === "a") {
    const href = element.getAttribute("href");
    if (href && href.trim()) {
      return true;
    }
    return Boolean(tabindex && Number.parseInt(tabindex, 10) >= 0);
  }

  if (tagName === "input") {
    const type = element.getAttribute("type");
    if (type && type.toLowerCase() === "hidden") {
      return false;
    }
  }

  return true;
};

const getMacroLabelSource = (attributes, body) => {
  const label = getAttributeValue(attributes, "label") || getAttributeValue(attributes, "text");
  if (label && label.trim()) {
    return label;
  }
  return body ?? "";
};

const MissingSkipLinkCheck = {
  id: "missing-skip-link",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    if (context.document?.querySelectorAll) {
      const focusableElements = Array.from(
        context.document.querySelectorAll("a,button,input,select,textarea,summary")
      ).filter(isFocusableElement);
      const skipLinkElement = focusableElements.find((element) => {
        if (element.tagName.toLowerCase() !== "a") {
          return false;
        }
        const href = element.getAttribute("href");
        if (!href || !href.trim().startsWith("#")) {
          return false;
        }
        const labelSource =
          element.getAttribute("aria-label")
          || element.getAttribute("title")
          || element.textContent
          || "";
        return isSkipLabel(labelSource);
      });

      if (!skipLinkElement) {
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

      const skipLinkIndex = focusableElements.indexOf(skipLinkElement);
      if (skipLinkIndex > 0) {
        const firstFocusable = focusableElements[0];
        const evidence = firstFocusable.outerHTML;
        return [
          {
            ruleId: rule.id,
            checkId: MissingSkipLinkCheck.id,
            filePath: context.filePath,
            line: getLineNumberForSnippet(context.content, evidence),
            message: "Skip link is not the first focusable element.",
            evidence
          }
        ];
      }

      return [];
    }

    let skipLinkIndex = null;
    for (const match of context.content.matchAll(anchorRegex)) {
      const { attrs, body } = match.groups;
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
      const { attrs } = match.groups;
      if (!isFocusable(tagName, attrs)) {
        continue;
      }

      firstFocusable = match;
      break;
    }

    for (const macro of collectFreemarkerMacros(context.content)) {
      if (!macroNameMatches(macro.name, ["a", "link"])) {
        continue;
      }
      const attrs = macro.attrs;
      const body = macro.body;
      const href = getAttributeValue(attrs, "href");
      if (!href || !href.trim().startsWith("#")) {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const title = getAttributeValue(attrs, "title");
      const labelSource = ariaLabel || title || getMacroLabelSource(attrs, body);
      if (!labelSource || !isSkipLabel(labelSource)) {
        continue;
      }

      if (skipLinkIndex === null || macro.index < skipLinkIndex) {
        skipLinkIndex = macro.index;
      }
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

module.exports = {
  MissingSkipLinkCheck,
  normalizeText,
  isSkipLabel,
  isFocusable,
  isFocusableElement,
  getMacroLabelSource
};
