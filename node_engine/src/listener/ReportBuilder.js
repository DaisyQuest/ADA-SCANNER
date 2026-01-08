class ReportBuilder {
  build({ documents = [], issues = [] } = {}) {
    const byRule = new Map();
    const byFile = new Map();
    const byTeam = new Map();

    for (const issue of issues) {
      const ruleId = issue.ruleId ?? "unknown";
      const filePath = issue.filePath ?? "unknown";
      const teamName = issue.teamName ?? "unassigned";

      const ruleEntry = this.ensureRuleEntry(byRule, ruleId, issue, teamName);
      ruleEntry.count += 1;
      if (filePath) {
        ruleEntry.files.add(filePath);
      }
      if (issue.checkId) {
        ruleEntry.checks.add(issue.checkId);
      }

      const fileEntry = this.ensureFileEntry(byFile, filePath);
      fileEntry.issueCount += 1;
      const fileRuleEntry = this.ensureRuleCount(fileEntry.rules, ruleId);
      fileRuleEntry.count += 1;

      const teamEntry = this.ensureTeamEntry(byTeam, teamName);
      teamEntry.issueCount += 1;
      const teamRuleEntry = this.ensureRuleCount(teamEntry.rules, ruleId);
      teamRuleEntry.count += 1;
    }

    return {
      summary: {
        documents: documents.length,
        issues: issues.length
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
        rules: this.sortRuleCounts(entry.rules)
      })),
      byTeam: this.sortByCount(byTeam, (entry) => ({
        teamName: entry.teamName,
        issueCount: entry.issueCount,
        rules: this.sortRuleCounts(entry.rules)
      }))
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
        rules: new Map()
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

  sortRuleCounts(ruleCounts) {
    return Array.from(ruleCounts.values()).sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.ruleId.localeCompare(b.ruleId);
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
}

module.exports = { ReportBuilder };
