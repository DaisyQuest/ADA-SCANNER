const { ReportBuilder } = require("../src/listener/ReportBuilder");

describe("ReportBuilder", () => {
  test("aggregates issues by rule, file, and team", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      documents: [{ url: "a" }, { url: "b" }],
      issues: [
        {
          ruleId: "rule-a",
          ruleDescription: "First rule",
          severity: "high",
          teamName: "team-a",
          filePath: "file-a.html",
          checkId: "check-1"
        },
        {
          ruleId: "rule-a",
          ruleDescription: "First rule",
          severity: "high",
          teamName: "team-a",
          filePath: "file-b.html",
          checkId: "check-1"
        },
        {
          ruleId: "rule-b",
          ruleDescription: "Second rule",
          severity: "low",
          teamName: "team-b",
          filePath: "file-a.html",
          checkId: "check-2"
        }
      ]
    });

    expect(report.summary).toEqual({ documents: 2, issues: 3 });
    expect(report.byRule).toEqual([
      {
        ruleId: "rule-a",
        description: "First rule",
        severity: "high",
        teamName: "team-a",
        count: 2,
        files: ["file-a.html", "file-b.html"],
        checks: ["check-1"]
      },
      {
        ruleId: "rule-b",
        description: "Second rule",
        severity: "low",
        teamName: "team-b",
        count: 1,
        files: ["file-a.html"],
        checks: ["check-2"]
      }
    ]);
    expect(report.byFile).toEqual([
      {
        filePath: "file-a.html",
        issueCount: 2,
        rules: [
          { ruleId: "rule-a", count: 1 },
          { ruleId: "rule-b", count: 1 }
        ]
      },
      {
        filePath: "file-b.html",
        issueCount: 1,
        rules: [{ ruleId: "rule-a", count: 1 }]
      }
    ]);
    expect(report.byTeam).toEqual([
      {
        teamName: "team-a",
        issueCount: 2,
        rules: [{ ruleId: "rule-a", count: 2 }]
      },
      {
        teamName: "team-b",
        issueCount: 1,
        rules: [{ ruleId: "rule-b", count: 1 }]
      }
    ]);
  });

  test("handles missing fields gracefully", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      documents: [],
      issues: [
        {
          ruleId: null,
          teamName: null,
          filePath: null
        }
      ]
    });

    expect(report.summary).toEqual({ documents: 0, issues: 1 });
    expect(report.byRule[0].ruleId).toBe("unknown");
    expect(report.byTeam[0].teamName).toBe("unassigned");
    expect(report.byFile[0].filePath).toBe("unknown");
  });
});
