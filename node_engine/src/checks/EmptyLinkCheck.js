const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, getLineNumberForSnippet, containsAttribute } = require("./TextUtilities");
const {
  collectElementIds,
  collectElementIdsFromDocument,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasTextContent
} = require("./AccessibleNameUtilities");
const { hasImageAltText, hasImageAltTextFromElement } = require("./MissingLinkTextCheck");

const linkRegex = /<a(?<attrs>[^>]*)>(?<content>[\s\S]*?)<\/a>/gi;

const isLink = (attributes) => {
  if (containsAttribute(attributes, "href")) {
    return true;
  }

  const role = getAttributeValue(attributes, "role");
  return Boolean(role && role.toLowerCase() === "link");
};

const EmptyLinkCheck = {
  id: "empty-link",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      const elementIds = collectElementIdsFromDocument(context.document);
      const candidates = Array.from(context.document.querySelectorAll("a, [role=\"link\"]"));
      const sourceAnchors = context.content ? Array.from(context.content.matchAll(linkRegex)) : [];
      let sourceIndex = 0;

      for (const link of candidates) {
        const isAnchor = link.tagName?.toLowerCase() === "a";
        const sourceMatch = isAnchor ? sourceAnchors[sourceIndex++] : null;
        const role = link.getAttribute("role");
        const hasHref = link.hasAttribute("href");
        if (!(hasHref || (role && role.toLowerCase() === "link"))) {
          continue;
        }

        if (hasTextContent(link.textContent || "")) {
          continue;
        }

        if (hasImageAltTextFromElement(link)) {
          continue;
        }

        const ariaLabel = link.getAttribute("aria-label");
        if (hasAriaLabel(ariaLabel)) {
          continue;
        }

        const labelledBy = link.getAttribute("aria-labelledby");
        if (hasValidAriaLabelledBy(labelledBy, elementIds)) {
          continue;
        }

        const title = link.getAttribute("title");
        if (hasTitle(title)) {
          continue;
        }

        const evidence = sourceMatch ? sourceMatch[0] : link.outerHTML;
        const matchIndex = sourceMatch?.index ?? -1;
        issues.push({
          ruleId: rule.id,
          checkId: EmptyLinkCheck.id,
          filePath: context.filePath,
          line: matchIndex >= 0
            ? getLineNumber(context.content, matchIndex)
            : getLineNumberForSnippet(context.content, evidence),
          message: "Link has no accessible name.",
          evidence
        });
      }

      return issues;
    }

    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(linkRegex)) {
      const attrs = match.groups?.attrs ?? "";
      if (!isLink(attrs)) {
        continue;
      }

      const content = match.groups?.content ?? "";
      if (hasTextContent(content)) {
        continue;
      }

      if (hasImageAltText(content)) {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      if (hasAriaLabel(ariaLabel)) {
        continue;
      }

      const labelledBy = getAttributeValue(attrs, "aria-labelledby");
      if (hasValidAriaLabelledBy(labelledBy, elementIds)) {
        continue;
      }

      const title = getAttributeValue(attrs, "title");
      if (hasTitle(title)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: EmptyLinkCheck.id,
        filePath: context.filePath,
        line,
        message: "Link has no accessible name.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { EmptyLinkCheck, isLink };
