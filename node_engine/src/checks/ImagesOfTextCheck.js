const { getLineNumber } = require("./TextUtilities");
const { getAttributeValue } = require("./AttributeParser");

const imgRegex = /<img(?<attrs>[^>]*)>/gi;
const textTokens = ["text", "word", "label", "button"];

const hasTextToken = (value) =>
  textTokens.some((token) => String(value ?? "").toLowerCase().includes(token));

const ImagesOfTextCheck = {
  id: "images-of-text",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(imgRegex)) {
      const attrs = match.groups.attrs;
      const className = getAttributeValue(attrs, "class");
      const id = getAttributeValue(attrs, "id");
      const dataText = getAttributeValue(attrs, "data-image-text") || getAttributeValue(attrs, "data-text-image");
      if (![className, id, dataText].some(hasTextToken)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: ImagesOfTextCheck.id,
        filePath: context.filePath,
        line,
        message: "Image appears to contain text; use real text when possible.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { ImagesOfTextCheck };
