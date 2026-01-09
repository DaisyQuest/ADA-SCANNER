const { getAttributeValue } = require("./AttributeParser");
const { collectFreemarkerMacros, macroNameMatches } = require("./FreemarkerUtilities");
const {
  collectLabelForIds,
  collectLabelRanges,
  collectElementIds,
  collectElementIdsFromDocument,
  collectLabelForIdsFromDocument,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasLabelForId,
  isWithinLabel,
  hasTextContent
} = require("./AccessibleNameUtilities");
const { getLineNumber, getLineNumberForSnippet } = require("./TextUtilities");

const buttonRegex = /<button(?<attrs>[^>]*)>(?<content>.*?)<\/button>/gis;
const inputRegex = /<input(?<attrs>[^>]*)>/gi;
const buttonInputTypes = new Set(["button", "submit", "reset", "image"]);

const hasButtonLabel = (attributes, content, elementIds, labelForIds, index, labelRanges) => {
  const ariaLabel = getAttributeValue(attributes, "aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = getAttributeValue(attributes, "aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = getAttributeValue(attributes, "title");
  if (hasTitle(title)) {
    return true;
  }

  const id = getAttributeValue(attributes, "id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  if (isWithinLabel(index, labelRanges)) {
    return true;
  }

  return hasTextContent(content);
};

const hasInputButtonLabel = (attributes, type, elementIds, labelForIds, index, labelRanges) => {
  if (type.toLowerCase() === "image") {
    const alt = getAttributeValue(attributes, "alt");
    if (alt && alt.trim()) {
      return true;
    }
  } else {
    const value = getAttributeValue(attributes, "value");
    if (value && value.trim()) {
      return true;
    }
  }

  const ariaLabel = getAttributeValue(attributes, "aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = getAttributeValue(attributes, "aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = getAttributeValue(attributes, "title");
  if (hasTitle(title)) {
    return true;
  }

  const id = getAttributeValue(attributes, "id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  return isWithinLabel(index, labelRanges);
};

const isWithinLabelElement = (element) => Boolean(element.closest && element.closest("label"));

const hasButtonLabelFromElement = (element, elementIds, labelForIds) => {
  const ariaLabel = element.getAttribute("aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = element.getAttribute("title");
  if (hasTitle(title)) {
    return true;
  }

  const id = element.getAttribute("id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  if (isWithinLabelElement(element)) {
    return true;
  }

  return hasTextContent(element.textContent ?? "");
};

const hasInputButtonLabelFromElement = (element, elementIds, labelForIds) => {
  const type = element.getAttribute("type") || "";
  if (type.toLowerCase() === "image") {
    const alt = element.getAttribute("alt");
    if (alt && alt.trim()) {
      return true;
    }
  } else {
    const value = element.getAttribute("value");
    if (value && value.trim()) {
      return true;
    }
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (hasAriaLabel(ariaLabel)) {
    return true;
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
    return true;
  }

  const title = element.getAttribute("title");
  if (hasTitle(title)) {
    return true;
  }

  const id = element.getAttribute("id");
  if (hasLabelForId(id, labelForIds)) {
    return true;
  }

  return isWithinLabelElement(element);
};

const getMacroButtonLabel = (attributes, body) => {
  const label = getAttributeValue(attributes, "label") || getAttributeValue(attributes, "text");
  if (label && label.trim()) {
    return label;
  }
  return body ?? "";
};

const UnlabeledButtonCheck = {
  id: "unlabeled-button",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      const elementIds = collectElementIdsFromDocument(context.document);
      const labelForIds = collectLabelForIdsFromDocument(context.document);
      for (const button of context.document.querySelectorAll("button")) {
        if (hasButtonLabelFromElement(button, elementIds, labelForIds)) {
          continue;
        }
        const evidence = button.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: UnlabeledButtonCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Button missing accessible label.",
          evidence
        });
      }

      for (const input of context.document.querySelectorAll("input")) {
        const type = input.getAttribute("type");
        if (!type || !buttonInputTypes.has(type)) {
          continue;
        }
        if (hasInputButtonLabelFromElement(input, elementIds, labelForIds)) {
          continue;
        }
        const evidence = input.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: UnlabeledButtonCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Button missing accessible label.",
          evidence
        });
      }

      return issues;
    }
    const labelForIds = collectLabelForIds(context.content);
    const labelRanges = collectLabelRanges(context.content);
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(buttonRegex)) {
      const attrs = match.groups.attrs;
      const content = match.groups.content;
      if (hasButtonLabel(attrs, content, elementIds, labelForIds, match.index, labelRanges)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: UnlabeledButtonCheck.id,
        filePath: context.filePath,
        line,
        message: "Button missing accessible label.",
        evidence: match[0]
      });
    }

    for (const match of context.content.matchAll(inputRegex)) {
      const attrs = match.groups.attrs;
      const type = getAttributeValue(attrs, "type");
      if (!type || !buttonInputTypes.has(type)) {
        continue;
      }

      if (hasInputButtonLabel(attrs, type, elementIds, labelForIds, match.index, labelRanges)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: UnlabeledButtonCheck.id,
        filePath: context.filePath,
        line,
        message: "Button missing accessible label.",
        evidence: match[0]
      });
    }

    for (const macro of collectFreemarkerMacros(context.content)) {
      if (macroNameMatches(macro.name, ["button"])) {
        const attrs = macro.attrs;
        const content = getMacroButtonLabel(attrs, macro.body);
        if (hasButtonLabel(attrs, content, elementIds, labelForIds, macro.index, labelRanges)) {
          continue;
        }
        const line = getLineNumber(context.content, macro.index);
        issues.push({
          ruleId: rule.id,
          checkId: UnlabeledButtonCheck.id,
          filePath: context.filePath,
          line,
          message: "Button missing accessible label.",
          evidence: macro.raw
        });
      }

      if (macroNameMatches(macro.name, ["input"])) {
        const attrs = macro.attrs;
        const type = getAttributeValue(attrs, "type");
        if (!type || !buttonInputTypes.has(type)) {
          continue;
        }
        if (hasInputButtonLabel(attrs, type, elementIds, labelForIds, macro.index, labelRanges)) {
          continue;
        }
        const line = getLineNumber(context.content, macro.index);
        issues.push({
          ruleId: rule.id,
          checkId: UnlabeledButtonCheck.id,
          filePath: context.filePath,
          line,
          message: "Button missing accessible label.",
          evidence: macro.raw
        });
      }
    }

    return issues;
  }
};

module.exports = {
  UnlabeledButtonCheck,
  hasButtonLabel,
  hasInputButtonLabel,
  hasButtonLabelFromElement,
  hasInputButtonLabelFromElement,
  getMacroButtonLabel,
  buttonInputTypes
};
