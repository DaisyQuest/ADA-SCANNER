const { getLineNumber } = require("./TextUtilities");

const allowedRoles = new Set([
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "dialog",
  "directory",
  "document",
  "feed",
  "figure",
  "form",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
]);

const roleRegex = /role="(?<role>[^"]+)"/gi;

const InvalidAriaRoleCheck = {
  id: "invalid-aria-role",
  applicableKinds: ["html", "htm", "cshtml", "razor"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(roleRegex)) {
      const roleValue = match.groups.role;
      const tokens = roleValue
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);

      for (const token of tokens) {
        if (allowedRoles.has(token.toLowerCase())) {
          continue;
        }

        const line = getLineNumber(context.content, match.index);
        issues.push({
          ruleId: rule.id,
          checkId: InvalidAriaRoleCheck.id,
          filePath: context.filePath,
          line,
          message: `Invalid ARIA role '${token}'.`,
          evidence: match[0]
        });
      }
    }

    return issues;
  }
};

module.exports = { InvalidAriaRoleCheck, allowedRoles };
