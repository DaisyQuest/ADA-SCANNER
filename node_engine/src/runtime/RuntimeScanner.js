const { RuleLoader } = require("../rules/RuleLoader");
const { createDefaultCheckRegistry } = require("../checks/CheckRegistry");

class RuntimeScanner {
  constructor({ ruleLoader = new RuleLoader(), checkRegistry = createDefaultCheckRegistry() } = {}) {
    this.ruleLoader = ruleLoader;
    this.checkRegistry = checkRegistry;
  }

  scanDocument({ rulesRoot, url, content, kind = "html", contentType = "text/html" }) {
    if (!rulesRoot || !rulesRoot.trim()) {
      throw new Error("Rules root is required.");
    }

    const ruleValidation = this.ruleLoader.validateRules(rulesRoot);
    if (!ruleValidation.isValid) {
      const details = ruleValidation.errors
        .map((error) => `${error.team}/${error.ruleId}: ${error.message}`)
        .join(" ");
      throw new Error(`Rule validation failed. ${details}`);
    }

    const rules = ruleValidation.teams.flatMap((team) => team.rules);
    const issues = [];
    const seenIssues = new Set();
    const context = {
      filePath: url,
      content,
      kind
    };

    for (const rule of rules) {
      const check = this.checkRegistry.find(rule.checkId);
      if (!check) {
        continue;
      }

      if (!check.applicableKinds.some((entry) => entry.toLowerCase() === context.kind.toLowerCase())) {
        continue;
      }

      if (rule.appliesTo) {
        const allowed = rule.appliesTo
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        if (!allowed.some((entry) => entry.toLowerCase() === context.kind.toLowerCase())) {
          continue;
        }
      }

      for (const issue of check.run(context, rule)) {
        const key = [issue.ruleId, issue.checkId, issue.filePath, issue.line, issue.message].join("::");
        if (!seenIssues.has(key)) {
          seenIssues.add(key);
          issues.push(issue);
        }
      }
    }

    return {
      document: {
        url,
        body: content,
        contentType
      },
      issues
    };
  }
}

module.exports = { RuntimeScanner };
