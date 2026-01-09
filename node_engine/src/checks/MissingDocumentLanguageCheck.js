const { getAttributeValue } = require("./AttributeParser");
const { getLineNumber, getLineNumberForSnippet } = require("./TextUtilities");

const htmlTagRegex = /<\s*html(?<attrs>[^>]*)>/i;

const MissingDocumentLanguageCheck = {
  id: "missing-document-language",
  applicableKinds: ["html", "htm"],
  run(context, rule) {
    if (context.document?.documentElement) {
      const root = context.document.documentElement;
      const lang = root.getAttribute("lang");
      const xmlLang = root.getAttribute("xml:lang");
      if ((lang && lang.trim()) || (xmlLang && xmlLang.trim())) {
        return [];
      }
      const evidence = root.outerHTML;
      return [
        {
          ruleId: rule.id,
          checkId: MissingDocumentLanguageCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: "Document language is missing or empty.",
          evidence
        }
      ];
    }

    const match = context.content.match(htmlTagRegex);
    if (!match) {
      return [];
    }

    const attrs = match.groups.attrs;
    const lang = getAttributeValue(attrs, "lang");
    const xmlLang = getAttributeValue(attrs, "xml:lang");

    if ((lang && lang.trim()) || (xmlLang && xmlLang.trim())) {
      return [];
    }

    const line = getLineNumber(context.content, match.index);
    return [
      {
        ruleId: rule.id,
        checkId: MissingDocumentLanguageCheck.id,
        filePath: context.filePath,
        line,
        message: "Document language is missing or empty.",
        evidence: match[0]
      }
    ];
  }
};

module.exports = { MissingDocumentLanguageCheck };
