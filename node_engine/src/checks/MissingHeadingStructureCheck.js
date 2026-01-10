const { getLineNumber } = require("./TextUtilities");

const headingRegex = /<h[1-6][^>]*>/i;

const MissingHeadingStructureCheck = {
  id: "missing-heading-structure",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    if (context.document?.querySelector) {
      if (context.document.querySelector("h1, h2, h3, h4, h5, h6")) {
        return [];
      }

      return [
        {
          ruleId: rule.id,
          checkId: MissingHeadingStructureCheck.id,
          filePath: context.filePath,
          line: getLineNumber(context.content, 0),
          message: "Document has no heading structure.",
          evidence: null
        }
      ];
    }

    if (headingRegex.test(context.content)) {
      return [];
    }

    return [
      {
        ruleId: rule.id,
        checkId: MissingHeadingStructureCheck.id,
        filePath: context.filePath,
        line: getLineNumber(context.content, 0),
        message: "Document has no heading structure.",
        evidence: null
      }
    ];
  }
};

module.exports = { MissingHeadingStructureCheck };
