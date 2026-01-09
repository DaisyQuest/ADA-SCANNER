const fs = require("fs");
const path = require("path");
const { RuleLoader } = require("../rules/RuleLoader");
const { createDefaultCheckRegistry } = require("../checks/CheckRegistry");
const { extractStylesheetLinks } = require("../utils/StylesheetLinks");

const DEFAULT_EXTENSIONS = new Map([
  [".java", { kind: "java", contentType: "text/x-java-source" }],
  [".ftl", { kind: "html", sourceKind: "ftl", contentType: "text/html" }],
  [".cs", { kind: "cs", contentType: "text/x-csharp" }],
  [".html", { kind: "html", contentType: "text/html" }],
  [".htm", { kind: "html", contentType: "text/html" }],
  [".cshtml", { kind: "cshtml", contentType: "text/html" }],
  [".razor", { kind: "razor", contentType: "text/html" }],
  [".xaml", { kind: "xaml", contentType: "application/xaml+xml" }],
  [".css", { kind: "css", contentType: "text/css" }],
  [".js", { kind: "js", contentType: "text/javascript" }]
]);

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  "bin",
  "obj",
  "dist",
  "build",
  "out",
  "coverage",
  "node_modules"
]);

const normalizePath = (rootDir, filePath) =>
  path.relative(rootDir, filePath).split(path.sep).join("/");

const collectFiles = (rootDir, extensionMap, ignoredDirs) => {
  const results = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (extensionMap.has(ext)) {
        results.push(fullPath);
      }
    }
  }

  return results;
};

class StaticAnalyzer {
  constructor({
    ruleLoader = new RuleLoader(),
    checkRegistry = createDefaultCheckRegistry(),
    extensionMap = DEFAULT_EXTENSIONS,
    ignoredDirs = DEFAULT_IGNORED_DIRS
  } = {}) {
    this.ruleLoader = ruleLoader;
    this.checkRegistry = checkRegistry;
    this.extensionMap = extensionMap;
    this.ignoredDirs = ignoredDirs;
  }

  scanRoot({ rootDir, rulesRoot }) {
    if (!rootDir || !rootDir.trim()) {
      throw new Error("Root directory is required.");
    }

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

    const rules = ruleValidation.teams.flatMap((team) =>
      team.rules.map((rule) => ({
        teamName: team.teamName,
        rule
      }))
    );

    const files = collectFiles(rootDir, this.extensionMap, this.ignoredDirs);
    const issues = [];
    const documents = [];
    const seenIssues = new Set();

    for (const filePath of files) {
      const entry = this.extensionMap.get(path.extname(filePath).toLowerCase());
      if (!entry) {
        continue;
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const normalizedPath = normalizePath(rootDir, filePath);
      const context = {
        filePath: normalizedPath,
        content,
        kind: entry.kind
      };

      documents.push({
        url: normalizedPath,
        contentType: entry.contentType,
        kind: entry.sourceKind ?? entry.kind,
        stylesheets: extractStylesheetLinks({ content, basePath: normalizedPath })
      });

      for (const entryRule of rules) {
        const rule = entryRule.rule;
        const check = this.checkRegistry.find(rule.checkId);
        if (!check) {
          continue;
        }

        if (!check.applicableKinds.some((entryKind) => entryKind.toLowerCase() === context.kind.toLowerCase())) {
          continue;
        }

        if (rule.appliesTo) {
          const allowed = rule.appliesTo
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((entryKind) => entryKind.toLowerCase());
          const applicableKinds = [context.kind, entry.sourceKind]
            .filter(Boolean)
            .map((entryKind) => entryKind.toLowerCase());
          if (!allowed.some((entryKind) => applicableKinds.includes(entryKind))) {
            continue;
          }
        }

        for (const issue of check.run(context, rule)) {
          const enrichedIssue = {
            ...issue,
            teamName: entryRule.teamName,
            ruleDescription: rule.description ?? "",
            severity: rule.severity ?? "",
            recommendation: rule.recommendation ?? null,
            wcagCriteria: rule.wcagCriteria ?? null,
            problemTags: rule.problemTags ?? null
          };
          const key = [issue.ruleId, issue.checkId, issue.filePath, issue.line, issue.message].join("::");
          if (!seenIssues.has(key)) {
            seenIssues.add(key);
            issues.push(enrichedIssue);
          }
        }
      }
    }

    return {
      documents,
      issues,
      rules: rules.map(({ teamName, rule }) => ({ ...rule, teamName }))
    };
  }
}

module.exports = {
  StaticAnalyzer,
  collectFiles,
  normalizePath,
  DEFAULT_EXTENSIONS,
  DEFAULT_IGNORED_DIRS
};
