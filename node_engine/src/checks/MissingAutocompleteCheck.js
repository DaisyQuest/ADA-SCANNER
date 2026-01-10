const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber } = require("./TextUtilities");

const inputRegex = /<(input|select|textarea)(?<attrs>[^>]*)>/gi;
const ignoredTypes = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "checkbox",
  "radio",
  "file",
  "range",
  "color",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "number"
]);

const purposeTokens = [
  "name",
  "first",
  "last",
  "given",
  "family",
  "middle",
  "email",
  "e-mail",
  "phone",
  "tel",
  "mobile",
  "address",
  "street",
  "city",
  "state",
  "province",
  "zip",
  "postal",
  "country",
  "company",
  "organization",
  "username",
  "password"
];

const normalizeText = (value) => String(value ?? "").toLowerCase();

const hasPurposeToken = (value) => {
  const normalized = normalizeText(value);
  return purposeTokens.some((token) => normalized.includes(token));
};

const MissingAutocompleteCheck = {
  id: "missing-autocomplete",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];

    for (const match of context.content.matchAll(inputRegex)) {
      const attrs = match.groups?.attrs ?? "";
      const type = normalizeText(getAttributeValue(attrs, "type"));
      if (type && ignoredTypes.has(type)) {
        continue;
      }

      const autocomplete = normalizeText(getAttributeValue(attrs, "autocomplete"));
      if (autocomplete && autocomplete !== "off") {
        continue;
      }

      const name = getAttributeValue(attrs, "name");
      const id = getAttributeValue(attrs, "id");
      const ariaLabel = getAttributeValue(attrs, "aria-label");
      const placeholder = getAttributeValue(attrs, "placeholder");

      if (![name, id, ariaLabel, placeholder].some(hasPurposeToken)) {
        continue;
      }

      const line = getLineNumber(context.content, match.index ?? 0);
      issues.push({
        ruleId: rule.id,
        checkId: MissingAutocompleteCheck.id,
        filePath: context.filePath,
        line,
        message: "Form field appears to collect personal data without autocomplete hints.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { MissingAutocompleteCheck };
