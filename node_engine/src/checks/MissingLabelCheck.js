const { getAttributeValue } = require("./AttributeParser");
const {
  collectLabelForIds,
  collectLabelForIdsFromDocument,
  collectLabelRanges,
  collectElementIds,
  collectElementIdsFromDocument,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasLabelForId,
  isWithinLabel
} = require("./AccessibleNameUtilities");
const { getLineNumber } = require("./TextUtilities");

const inputRegex = /<(input|select|textarea)(?<attrs>[^>]*)>/gi;

const MissingLabelCheck = {
  id: "missing-label",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (context.document?.querySelectorAll) {
      const labelForIds = collectLabelForIdsFromDocument(context.document);
      const elementIds = collectElementIdsFromDocument(context.document);
      const elementPositions = Array.from(context.content.matchAll(/<(input|select|textarea)\b/gi))
        .map((match) => match.index);
      let positionIndex = 0;

      for (const control of context.document.querySelectorAll("input, select, textarea")) {
        const matchIndex = elementPositions[positionIndex] ?? 0;
        positionIndex += 1;
        const type = control.getAttribute("type");
        if (type && type.toLowerCase() === "hidden") {
          continue;
        }

        const ariaLabel = control.getAttribute("aria-label");
        if (hasAriaLabel(ariaLabel)) {
          continue;
        }

        const labelledBy = control.getAttribute("aria-labelledby");
        if (hasValidAriaLabelledBy(labelledBy, elementIds)) {
          continue;
        }

        const id = control.getAttribute("id");
        if (hasLabelForId(id, labelForIds)) {
          continue;
        }

        if (control.closest("label")) {
          continue;
        }

        const evidence = control.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: MissingLabelCheck.id,
          filePath: context.filePath,
          line: getLineNumber(context.content, matchIndex),
          message: "Form control missing accessible label.",
          evidence
        });
      }

      return issues;
    }

    const labels = collectLabelForIds(context.content);
    const labelRanges = collectLabelRanges(context.content);
    const elementIds = collectElementIds(context.content);

    for (const match of context.content.matchAll(inputRegex)) {
      const attrs = match.groups.attrs;
      const type = getAttributeValue(attrs, "type");
      if (type && type.toLowerCase() === "hidden") {
        continue;
      }

      const ariaLabel = getAttributeValue(attrs, "aria-label");
      if (hasAriaLabel(ariaLabel)) {
        continue;
      }

      const ariaLabelledBy = getAttributeValue(attrs, "aria-labelledby");
      if (hasValidAriaLabelledBy(ariaLabelledBy, elementIds)) {
        continue;
      }

      const id = getAttributeValue(attrs, "id");
      if (hasLabelForId(id, labels)) {
        continue;
      }

      if (isWithinLabel(match.index, labelRanges)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: MissingLabelCheck.id,
        filePath: context.filePath,
        line,
        message: "Form control missing accessible label.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingLabelCheck };
