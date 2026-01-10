const { ReportBuilder } = require("../listener/ReportBuilder");

class StaticReportBuilder {
  constructor({ reportBuilder = new ReportBuilder() } = {}) {
    this.reportBuilder = reportBuilder;
  }

  build({ documents = [], issues = [], rules = [] } = {}) {
    const base = this.reportBuilder.build({ documents, issues });
    const coverage = this.buildCoverage({ rules, issues });
    const fileMap = new Map();
    const stylesheetIssuesByFile = this.reportBuilder.buildStylesheetIssueMap({ documents, issues });

    for (const document of documents) {
      if (!document?.url) {
        continue;
      }
      fileMap.set(document.url, {
        filePath: document.url,
        issueCount: 0,
        rules: [],
        teams: [],
        severities: [],
        checks: [],
        linkedStylesheetsWithIssues: stylesheetIssuesByFile.get(document.url) ?? [],
        linkedStylesheetIssueCount: this.reportBuilder.sumIssueCounts(stylesheetIssuesByFile.get(document.url))
      });
    }

    for (const entry of base.byFile) {
      fileMap.set(entry.filePath, {
        ...entry,
        linkedStylesheetsWithIssues: entry.linkedStylesheetsWithIssues ?? [],
        linkedStylesheetIssueCount: entry.linkedStylesheetIssueCount ?? 0
      });
    }

    const byFile = Array.from(fileMap.values()).sort((a, b) => {
      if (b.issueCount !== a.issueCount) {
        return b.issueCount - a.issueCount;
      }
      return String(a.filePath).localeCompare(String(b.filePath));
    });
    const fileCount = fileMap.size;

    return {
      ...base,
      summary: {
        ...base.summary,
        documents: fileCount,
        files: fileCount,
        coverage
      },
      byFile,
      coverage
    };
  }

  buildFileSummaries({ documents = [], issues = [], rules = [] } = {}) {
    return this.build({ documents, issues, rules }).byFile;
  }

  buildFileReport({ filePath, documents = [], issues = [] } = {}) {
    return this.reportBuilder.buildFileReport({ filePath, documents, issues });
  }

  buildCoverage({ rules = [], issues = [] } = {}) {
    const ruleMap = new Map();
    for (const rule of Array.isArray(rules) ? rules : []) {
      const ruleId = rule?.id ?? rule?.ruleId ?? "";
      if (!ruleId) {
        continue;
      }
      const teamName = rule?.teamName ?? rule?.team ?? "unassigned";
      const key = `${teamName}::${ruleId}`;
      if (!ruleMap.has(key)) {
        ruleMap.set(key, {
          ruleId,
          teamName,
          description: rule?.description ?? "",
          severity: rule?.severity ?? "",
          checkId: rule?.checkId ?? "",
          wcagCriteria: rule?.wcagCriteria ?? null,
          problemTags: rule?.problemTags ?? null
        });
      }
    }

    const triggered = new Set();
    for (const issue of issues) {
      const ruleId = issue?.ruleId ?? "";
      if (!ruleId) {
        continue;
      }
      const teamName = issue?.teamName ?? "unassigned";
      const key = `${teamName}::${ruleId}`;
      if (ruleMap.has(key)) {
        triggered.add(key);
      }
    }

    const missingRules = Array.from(ruleMap.entries())
      .filter(([key]) => !triggered.has(key))
      .map(([, rule]) => rule)
      .sort((a, b) => {
        const teamCompare = String(a.teamName).localeCompare(String(b.teamName));
        if (teamCompare !== 0) {
          return teamCompare;
        }
        return String(a.ruleId).localeCompare(String(b.ruleId));
      });

    const totalRules = ruleMap.size;
    const triggeredRules = triggered.size;
    const missingRuleCount = missingRules.length;
    const coveragePercent = totalRules
      ? Math.round((triggeredRules / totalRules) * 100)
      : 0;

    return {
      totalRules,
      triggeredRules,
      missingRuleCount,
      coveragePercent,
      missingRules
    };
  }
}

module.exports = { StaticReportBuilder };
