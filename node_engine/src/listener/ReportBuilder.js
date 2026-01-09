class ReportBuilder {
  build({ documents = [], issues = [] } = {}) {
    const byRule = new Map();
    const byFile = new Map();
    const byTeam = new Map();
    const stylesheetIssuesByFile = this.buildStylesheetIssueMap({ documents, issues });

    for (const issue of issues) {
      const ruleId = issue.ruleId ?? "unknown";
      const filePath = issue.filePath ?? "unknown";
      const teamName = issue.teamName ?? "unassigned";
      const severity = issue.severity ?? "unspecified";
      const checkId = issue.checkId ?? "unknown";

      const ruleEntry = this.ensureRuleEntry(byRule, ruleId, issue, teamName);
      ruleEntry.count += 1;
      if (filePath) {
        ruleEntry.files.add(filePath);
      }
      ruleEntry.checks.add(checkId);

      const fileEntry = this.ensureFileEntry(byFile, filePath);
      fileEntry.issueCount += 1;
      const fileRuleEntry = this.ensureRuleCount(fileEntry.rules, ruleId);
      fileRuleEntry.count += 1;
      this.incrementCount(fileEntry.teams, teamName);
      this.incrementCount(fileEntry.severities, severity);
      this.incrementCount(fileEntry.checks, checkId);

      const teamEntry = this.ensureTeamEntry(byTeam, teamName);
      teamEntry.issueCount += 1;
      const teamRuleEntry = this.ensureRuleCount(teamEntry.rules, ruleId);
      teamRuleEntry.count += 1;
    }

    for (const filePath of stylesheetIssuesByFile.keys()) {
      this.ensureFileEntry(byFile, filePath);
    }

    return {
      summary: {
        documents: documents.length,
        issues: issues.length,
        files: byFile.size
      },
      byRule: this.sortByCount(byRule, (entry) => ({
        ruleId: entry.ruleId,
        description: entry.description,
        severity: entry.severity,
        teamName: entry.teamName,
        count: entry.count,
        files: Array.from(entry.files).sort(),
        checks: Array.from(entry.checks).sort()
      })),
      byFile: this.sortByCount(byFile, (entry) => ({
        filePath: entry.filePath,
        issueCount: entry.issueCount,
        rules: this.sortRuleCounts(entry.rules),
        teams: this.sortCountMap(entry.teams, "teamName"),
        severities: this.sortCountMap(entry.severities, "severity"),
        checks: this.sortCountMap(entry.checks, "checkId"),
        linkedStylesheetsWithIssues: stylesheetIssuesByFile.get(entry.filePath) ?? [],
        linkedStylesheetIssueCount: this.sumIssueCounts(stylesheetIssuesByFile.get(entry.filePath))
      })),
      byTeam: this.sortByCount(byTeam, (entry) => ({
        teamName: entry.teamName,
        issueCount: entry.issueCount,
        rules: this.sortRuleCounts(entry.rules)
      }))
    };
  }

  buildFileSummaries({ documents = [], issues = [] } = {}) {
    return this.build({ documents, issues }).byFile;
  }

  buildFileReport({ filePath, documents = [], issues = [] } = {}) {
    const resolvedPath = filePath ?? "unknown";
    const fileIssues = issues.filter((issue) => (issue.filePath ?? "unknown") === resolvedPath);
    const counts = this.buildCountMaps(fileIssues);
    const document = documents.find((entry) => entry.url === resolvedPath) ?? null;
    const stylesheetIssuesByFile = this.buildStylesheetIssueMap({ documents, issues });
    const linkedStylesheetsWithIssues = stylesheetIssuesByFile.get(resolvedPath) ?? [];

    return {
      filePath: resolvedPath,
      issueCount: fileIssues.length,
      document: document
        ? {
          url: document.url,
          contentType: document.contentType ?? null
        }
        : null,
      byRule: this.sortRuleCounts(counts.rules),
      byTeam: this.sortCountMap(counts.teams, "teamName"),
      bySeverity: this.sortCountMap(counts.severities, "severity"),
      byCheck: this.sortCountMap(counts.checks, "checkId"),
      linkedStylesheetsWithIssues,
      linkedStylesheetIssueCount: this.sumIssueCounts(linkedStylesheetsWithIssues),
      issues: fileIssues
        .slice()
        .sort((a, b) => {
          const lineA = a.line ?? 0;
          const lineB = b.line ?? 0;
          if (lineA !== lineB) {
            return lineA - lineB;
          }
          const ruleA = a.ruleId ?? "";
          const ruleB = b.ruleId ?? "";
          return ruleA.localeCompare(ruleB);
        })
    };
  }

  ensureRuleEntry(byRule, ruleId, issue, teamName) {
    if (!byRule.has(ruleId)) {
      byRule.set(ruleId, {
        ruleId,
        description: issue.ruleDescription ?? "",
        severity: issue.severity ?? "",
        teamName,
        count: 0,
        files: new Set(),
        checks: new Set()
      });
    }

    return byRule.get(ruleId);
  }

  ensureFileEntry(byFile, filePath) {
    if (!byFile.has(filePath)) {
      byFile.set(filePath, {
        filePath,
        issueCount: 0,
        rules: new Map(),
        teams: new Map(),
        severities: new Map(),
        checks: new Map()
      });
    }

    return byFile.get(filePath);
  }

  ensureTeamEntry(byTeam, teamName) {
    if (!byTeam.has(teamName)) {
      byTeam.set(teamName, {
        teamName,
        issueCount: 0,
        rules: new Map()
      });
    }

    return byTeam.get(teamName);
  }

  ensureRuleCount(ruleCounts, ruleId) {
    if (!ruleCounts.has(ruleId)) {
      ruleCounts.set(ruleId, { ruleId, count: 0 });
    }

    return ruleCounts.get(ruleId);
  }

  incrementCount(counts, key) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  buildCountMaps(issues) {
    const rules = new Map();
    const teams = new Map();
    const severities = new Map();
    const checks = new Map();

    for (const issue of issues) {
      const ruleId = issue.ruleId ?? "unknown";
      const teamName = issue.teamName ?? "unassigned";
      const severity = issue.severity ?? "unspecified";
      const checkId = issue.checkId ?? "unknown";

      this.ensureRuleCount(rules, ruleId).count += 1;
      this.incrementCount(teams, teamName);
      this.incrementCount(severities, severity);
      this.incrementCount(checks, checkId);
    }

    return { rules, teams, severities, checks };
  }

  sortRuleCounts(ruleCounts) {
    return Array.from(ruleCounts.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.ruleId.localeCompare(b.ruleId);
    });
  }

  sortCountMap(counts, keyName) {
    return Array.from(counts.entries())
      .map(([key, count]) => ({ [keyName]: key, count }))
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return String(a[keyName]).localeCompare(String(b[keyName]));
      });
  }

  sortByCount(map, mapper) {
    return Array.from(map.values())
      .sort((a, b) => {
        const countA = a.count ?? a.issueCount ?? 0;
        const countB = b.count ?? b.issueCount ?? 0;
        if (countB !== countA) {
          return countB - countA;
        }

        const nameA = a.ruleId ?? a.filePath ?? a.teamName ?? "";
        const nameB = b.ruleId ?? b.filePath ?? b.teamName ?? "";
        return nameA.localeCompare(nameB);
      })
      .map(mapper);
  }

  buildStylesheetIssueMap({ documents = [], issues = [] } = {}) {
    const issueCounts = new Map();
    for (const issue of issues) {
      const filePath = issue.filePath ?? null;
      if (!filePath) {
        continue;
      }
      issueCounts.set(filePath, (issueCounts.get(filePath) ?? 0) + 1);
    }

    const byFile = new Map();
    for (const document of documents) {
      const filePath = document?.url;
      if (!filePath) {
        continue;
      }

      const stylesheets = Array.isArray(document.stylesheets) ? document.stylesheets : [];
      const linked = stylesheets
        .map((stylesheet) => ({
          filePath: stylesheet,
          count: issueCounts.get(stylesheet) ?? 0
        }))
        .filter((entry) => entry.count > 0);

      if (linked.length) {
        byFile.set(filePath, linked);
      }
    }

    return byFile;
  }

  sumIssueCounts(entries) {
    if (!Array.isArray(entries)) {
      return 0;
    }

    return entries.reduce((total, entry) => total + (entry.count ?? 0), 0);
  }
}

module.exports = { ReportBuilder };
