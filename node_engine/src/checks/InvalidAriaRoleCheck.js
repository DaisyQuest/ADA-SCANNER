const { getLineNumber } = require("./TextUtilities");

const allowedRoles = new Set([
  "banner",
  "button",
  "checkbox",
  "dialog",
  "grid",
  "link",
  "list",
  "listitem",
  "main",
  "navigation",
  "region",
  "search",
  "textbox"
]);

const roleRegex = /role="(?<role>[^"]+)"/gi;

const InvalidAriaRoleCheck = {
  id: "invalid-aria-role",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(roleRegex)) {
      const role = match.groups.role;
      if (allowedRoles.has(role.toLowerCase())) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: InvalidAriaRoleCheck.id,
        filePath: context.filePath,
        line,
        message: `Invalid ARIA role '${role}'.`,
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { InvalidAriaRoleCheck, allowedRoles };
