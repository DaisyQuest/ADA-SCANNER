const { getLineNumberForSnippet } = require("./TextUtilities");

const DuplicateIdCheck = {
  id: "duplicate-id",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    if (!context.document?.querySelectorAll) {
      return issues;
    }

    const seen = new Map();
    for (const element of Array.from(context.document.querySelectorAll("[id]"))) {
      const id = element.getAttribute("id");
      if (!id) {
        continue;
      }
      if (seen.has(id)) {
        const evidence = element.outerHTML;
        issues.push({
          ruleId: rule.id,
          checkId: DuplicateIdCheck.id,
          filePath: context.filePath,
          line: getLineNumberForSnippet(context.content, evidence),
          message: `Duplicate id found: ${id}.`,
          evidence
        });
        continue;
      }
      seen.set(id, true);
    }

    return issues;
  }
};

module.exports = { DuplicateIdCheck };
