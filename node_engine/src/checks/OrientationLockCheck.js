const { getLineNumber } = require("./TextUtilities");

const orientationPatterns = [
  /screen\.orientation\.lock/i,
  /lockOrientation/i,
  /orientation\.lock/i
];

const OrientationLockCheck = {
  id: "orientation-lock",
  applicableKinds: ["html", "htm", "cshtml", "razor", "js"],
  run(context, rule) {
    const issues = [];
    for (const pattern of orientationPatterns) {
      const match = context.content.match(pattern);
      if (match) {
        const index = context.content.search(pattern);
        issues.push({
          ruleId: rule.id,
          checkId: OrientationLockCheck.id,
          filePath: context.filePath,
          line: getLineNumber(context.content, Math.max(index, 0)),
          message: "Orientation lock detected; ensure multiple orientations are supported.",
          evidence: match[0]
        });
        break;
      }
    }

    return issues;
  }
};

module.exports = { OrientationLockCheck };
