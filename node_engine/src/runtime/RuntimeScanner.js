const { RuleLoader } = require("../rules/RuleLoader");
const { createDefaultCheckRegistry } = require("../checks/CheckRegistry");
const { extractStylesheetLinks } = require("../utils/StylesheetLinks");
const { createDomDocument } = require("../utils/DomParser");
const { buildHtmlSnippet } = require("../utils/HtmlSnippetBuilder");
const { extractEmbeddedContent, buildPaddedContent } = require("../static/EmbeddedContent");

class RuntimeScanner {
  constructor({ ruleLoader = new RuleLoader(), checkRegistry = createDefaultCheckRegistry() } = {}) {
    this.ruleLoader = ruleLoader;
    this.checkRegistry = checkRegistry;
  }

  scanDocument({ rulesRoot, url, content, kind = "html", contentType = "text/html", sourceKind, documentContent }) {
    if (!rulesRoot || !rulesRoot.trim()) {
      throw new Error("Rules root is required.");
    }

    const ruleValidation = this.ruleLoader.validateRules(rulesRoot);
    const rules = this.getValidatedRules(ruleValidation);
    const domContent = documentContent ?? content;
    const contexts = [
      {
        filePath: url,
        content,
        kind,
        sourceKind,
        document: createDomDocument({ content: domContent, url })
      }
    ];

    return this.scanContexts({
      rules,
      contexts,
      url,
      contentType,
      documentBody: domContent,
      stylesheets: extractStylesheetLinks({ content: domContent, baseUrl: url })
    });
  }

  scanEvaluatedContent({ rulesRoot, url, content, kind = "html" }) {
    if (!rulesRoot || !rulesRoot.trim()) {
      throw new Error("Rules root is required.");
    }

    const ruleValidation = this.ruleLoader.validateRules(rulesRoot);
    const rules = this.getValidatedRules(ruleValidation);
    const snippet = buildHtmlSnippet({ content, kind });
    const contexts = this.buildEvaluationContexts({
      content,
      kind: snippet.kind,
      sourceKind: snippet.sourceKind,
      url,
      html: snippet.html
    });

    return this.scanContexts({
      rules,
      contexts,
      url,
      contentType: snippet.contentType,
      documentBody: snippet.html,
      stylesheets: extractStylesheetLinks({ content: snippet.html, baseUrl: url })
    });
  }

  getValidatedRules(ruleValidation) {
    if (!ruleValidation.isValid) {
      const details = ruleValidation.errors
        .map((error) => `${error.team}/${error.ruleId}: ${error.message}`)
        .join(" ");
      throw new Error(`Rule validation failed. ${details}`);
    }

    return ruleValidation.teams.flatMap((team) =>
      team.rules.map((rule) => ({
        teamName: team.teamName,
        rule
      }))
    );
  }

  buildEvaluationContexts({ content, kind, sourceKind, url, html }) {
    const contexts = [];
    const normalizedKind = String(kind ?? "html").toLowerCase();
    if (normalizedKind === "js") {
      contexts.push({
        filePath: url,
        content,
        kind: "js",
        sourceKind: sourceKind ?? "js",
        document: null
      });

      const embeddedSnippets = extractEmbeddedContent(content);
      for (const snippet of embeddedSnippets) {
        const paddedContent = buildPaddedContent(content, snippet.startIndex, snippet.content);
        contexts.push({
          filePath: url,
          content: paddedContent,
          kind: snippet.kind,
          sourceKind: "js",
          document: snippet.kind === "html"
            ? createDomDocument({ content: paddedContent, url })
            : null
        });
      }
      return contexts;
    }

    if (normalizedKind === "css") {
      contexts.push({
        filePath: url,
        content,
        kind: "css",
        sourceKind: sourceKind ?? "css",
        document: null
      });
      return contexts;
    }

    contexts.push({
      filePath: url,
      content,
      kind: normalizedKind,
      sourceKind,
      document: createDomDocument({ content: html ?? content, url })
    });

    return contexts;
  }

  scanContexts({ rules, contexts, url, contentType, documentBody, stylesheets }) {
    const issues = [];
    const seenIssues = new Set();

    for (const context of contexts) {
      for (const entry of rules) {
        const rule = entry.rule;
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
          const applicableKinds = [context.kind, context.sourceKind]
            .filter(Boolean)
            .map((entryKind) => entryKind.toLowerCase());
          if (!allowed.some((entryKind) => applicableKinds.includes(entryKind))) {
            continue;
          }
        }

        for (const issue of check.run(context, rule)) {
          const enrichedIssue = {
            ...issue,
            teamName: entry.teamName,
            ruleDescription: rule.description ?? "",
            severity: rule.severity ?? "",
            recommendation: rule.recommendation ?? null,
            wcagCriteria: rule.wcagCriteria ?? null,
            problemTags: rule.problemTags ?? null,
            algorithm: rule.algorithm ?? null,
            algorithmAdvanced: rule.algorithmAdvanced ?? null
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
      document: {
        url,
        body: documentBody,
        contentType,
        stylesheets
      },
      issues,
      rules: rules.map(({ teamName, rule }) => ({ ...rule, teamName }))
    };
  }
}

module.exports = { RuntimeScanner };
