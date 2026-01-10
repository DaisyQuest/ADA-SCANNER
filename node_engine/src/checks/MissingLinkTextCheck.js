const { getAttributeValue } = require("./AttributeParser");
const { collectFreemarkerMacros, macroNameMatches } = require("./FreemarkerUtilities");
const { getLineNumber, getLineNumberForSnippet } = require("./TextUtilities");
const {
  collectElementIds,
  collectElementIdsFromDocument,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasTextContent
} = require("./AccessibleNameUtilities");

const linkRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
const imageRegex = /<img([^>]*)>/gi;

const hasImageAltText = (body) => {
  for (const match of body.matchAll(imageRegex)) {
    const alt = getAttributeValue(match[1], "alt");
    if (alt && alt.trim()) {
      return true;
    }
  }

  return false;
};

const hasImageAltTextFromElement = (element) =>
  Array.from(element.querySelectorAll("img"))
    .some((image) => {
      const alt = image.getAttribute("alt");
      return alt && alt.trim();
    });

const hasAccessibleLabelFromElement = (element, elementIds) => {
  const ariaLabel = element.getAttribute("aria-label");
  const labelledBy = element.getAttribute("aria-labelledby");
  const title = element.getAttribute("title");
  const textContent = element.textContent || "";

  return (
    hasAriaLabel(ariaLabel)
    || hasValidAriaLabelledBy(labelledBy, elementIds)
    || hasTitle(title)
    || hasTextContent(textContent)
    || hasImageAltTextFromElement(element)
  );
};

const getMacroTextLabel = (attributes, body) => {
  const label = getAttributeValue(attributes, "label") || getAttributeValue(attributes, "text");
  if (label && label.trim()) {
    return label;
  }
  return body ?? "";
};

const MissingLinkTextCheck = {
  id: "missing-link-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      const elementIds = collectElementIdsFromDocument(context.document);
      const sourceAnchors = context.content ? Array.from(context.content.matchAll(linkRegex)) : [];
      let sourceIndex = 0;
      for (const link of context.document.querySelectorAll("a")) {
        const sourceMatch = sourceAnchors[sourceIndex++] ?? null;
        if (hasAccessibleLabelFromElement(link, elementIds)) {
          continue;
        }
        const evidence = sourceMatch ? sourceMatch[0] : link.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: MissingLinkTextCheck.id,
          filePath: context.filePath,
          line: sourceMatch
            ? getLineNumber(context.content, sourceMatch.index)
            : getLineNumberForSnippet(context.content, evidence),
          message: "Link missing accessible text.",
          evidence
        });
      }

      return issues;
    }
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(linkRegex)) {
      const attrs = match[1];
      const body = match[2];

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const labelledBy = getAttributeValue(attrs, "aria-labelledby");
      const title = getAttributeValue(attrs, "title");

      const hasAccessibleLabel =
        hasAriaLabel(ariaLabel) ||
        hasValidAriaLabelledBy(labelledBy, elementIds) ||
        hasTitle(title) ||
        hasTextContent(body) ||
        hasImageAltText(body);

      if (!hasAccessibleLabel) {
        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: MissingLinkTextCheck.id,
          filePath: context.filePath,
          line,
          message: "Link missing accessible text.",
          evidence: match[0]
        });
      }
    }

    for (const macro of collectFreemarkerMacros(context.content)) {
      if (!macroNameMatches(macro.name, ["a", "link"])) {
        continue;
      }
      const attrs = macro.attrs;
      const body = macro.body;
      const labelSource = getMacroTextLabel(attrs, body);
      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const labelledBy = getAttributeValue(attrs, "aria-labelledby");
      const title = getAttributeValue(attrs, "title");

      const hasAccessibleLabel =
        hasAriaLabel(ariaLabel)
        || hasValidAriaLabelledBy(labelledBy, elementIds)
        || hasTitle(title)
        || hasTextContent(labelSource);

      if (!hasAccessibleLabel) {
        const line = getLineNumber(context.content, macro.index);
        issues.push({
          ruleId: rule.id,
          checkId: MissingLinkTextCheck.id,
          filePath: context.filePath,
          line,
          message: "Link missing accessible text.",
          evidence: macro.raw
        });
      }
    }

    return issues;
  }
};

module.exports = {
  MissingLinkTextCheck,
  hasImageAltText,
  hasImageAltTextFromElement,
  hasAccessibleLabelFromElement,
  getMacroTextLabel
};
