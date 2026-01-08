const { getLineNumber, containsAttribute } = require("./TextUtilities");

const controlRegex = /<(Image|Button|TextBox)(?<attrs>[^>]*)>/gi;

const XamlMissingNameCheck = {
  id: "xaml-missing-name",
  applicableKinds: ["xaml"],
  run(context, rule) {
    const issues = [];
    for (const match of context.content.matchAll(controlRegex)) {
      const attrs = match.groups.attrs;
      if (
        containsAttribute(attrs, "AutomationProperties.Name") ||
        containsAttribute(attrs, "AutomationProperties.HelpText")
      ) {
        continue;
      }

      const line = getLineNumber(context.content, match.index);
      issues.push({
        ruleId: rule.id,
        checkId: XamlMissingNameCheck.id,
        filePath: context.filePath,
        line,
        message: "XAML control missing AutomationProperties.Name.",
        evidence: match[0]
      });
    }

    return issues;
  }
};

module.exports = { XamlMissingNameCheck };
