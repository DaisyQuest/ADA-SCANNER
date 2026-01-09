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

    expect(report.summary).toEqual({ documents: 2, issues: 3, files: 2 });
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
        ],
        teams: [
          { teamName: "team-a", count: 1 },
          { teamName: "team-b", count: 1 }
        ],
        severities: [
          { severity: "high", count: 1 },
          { severity: "low", count: 1 }
        ],
        checks: [
          { checkId: "check-1", count: 1 },
          { checkId: "check-2", count: 1 }
        ],
        linkedStylesheetsWithIssues: [],
        linkedStylesheetIssueCount: 0
      },
      {
        filePath: "file-b.html",
        issueCount: 1,
        rules: [{ ruleId: "rule-a", count: 1 }],
        teams: [{ teamName: "team-a", count: 1 }],
        severities: [{ severity: "high", count: 1 }],
        checks: [{ checkId: "check-1", count: 1 }],
        linkedStylesheetsWithIssues: [],
        linkedStylesheetIssueCount: 0
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

    expect(report.summary).toEqual({ documents: 0, issues: 1, files: 1 });
    expect(report.byRule[0].ruleId).toBe("unknown");
    expect(report.byTeam[0].teamName).toBe("unassigned");
    expect(report.byFile[0].filePath).toBe("unknown");
    expect(report.byFile[0].linkedStylesheetsWithIssues).toEqual([]);
    expect(report.byFile[0].linkedStylesheetIssueCount).toBe(0);
  });

  test("builds empty report by default", () => {
    const builder = new ReportBuilder();
    const report = builder.build();

    expect(report.summary).toEqual({ documents: 0, issues: 0, files: 0 });
    expect(report.byRule).toEqual([]);
    expect(report.byFile).toEqual([]);
    expect(report.byTeam).toEqual([]);
  });

  test("builds detailed file reports", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [{ url: "file-a.html", contentType: "text/html" }],
      issues: [
        {
          ruleId: "rule-a",
          severity: "high",
          teamName: "team-a",
          filePath: "file-a.html",
          checkId: "check-1",
          line: 10
        },
        {
          ruleId: "rule-b",
          severity: "low",
          teamName: "team-b",
          filePath: "file-a.html",
          checkId: "check-2",
          line: 3
        }
      ]
    });

    expect(report.issueCount).toBe(2);
    expect(report.document).toEqual({ url: "file-a.html", contentType: "text/html" });
    expect(report.byRule).toEqual([
      { ruleId: "rule-a", count: 1 },
      { ruleId: "rule-b", count: 1 }
    ]);
    expect(report.byTeam).toEqual([
      { teamName: "team-a", count: 1 },
      { teamName: "team-b", count: 1 }
    ]);
    expect(report.bySeverity).toEqual([
      { severity: "high", count: 1 },
      { severity: "low", count: 1 }
    ]);
    expect(report.byCheck).toEqual([
      { checkId: "check-1", count: 1 },
      { checkId: "check-2", count: 1 }
    ]);
    expect(report.linkedStylesheetsWithIssues).toEqual([]);
    expect(report.linkedStylesheetIssueCount).toBe(0);
    expect(report.issues.map((issue) => issue.line)).toEqual([3, 10]);
  });

  test("annotates linked stylesheet issues for file reports", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "page.html",
      documents: [
        { url: "page.html", contentType: "text/html", stylesheets: ["styles.css", "other.css"] }
      ],
      issues: [
        { ruleId: "rule-a", filePath: "styles.css" },
        { ruleId: "rule-b", filePath: "styles.css" },
        { ruleId: "rule-c", filePath: "other.css" }
      ]
    });

    expect(report.linkedStylesheetsWithIssues).toEqual([
      { filePath: "styles.css", count: 2 },
      { filePath: "other.css", count: 1 }
    ]);
    expect(report.linkedStylesheetIssueCount).toBe(3);
  });

  test("includes files that link to stylesheet issues in summaries", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      documents: [{ url: "page.html", stylesheets: ["styles.css"] }],
      issues: [{ ruleId: "rule-a", filePath: "styles.css" }]
    });

    const pageEntry = report.byFile.find((entry) => entry.filePath === "page.html");
    expect(report.summary.files).toBe(2);
    expect(pageEntry.issueCount).toBe(0);
    expect(pageEntry.linkedStylesheetsWithIssues).toEqual([{ filePath: "styles.css", count: 1 }]);
    expect(pageEntry.linkedStylesheetIssueCount).toBe(1);
  });

  test("handles empty stylesheet metadata gracefully", () => {
    const builder = new ReportBuilder();
    const map = builder.buildStylesheetIssueMap({
      documents: [
        { url: "" },
        { url: "page.html", stylesheets: null },
        { url: "other.html", stylesheets: ["no-issues.css"] }
      ],
      issues: [{ ruleId: "rule-a", filePath: null }]
    });

    expect(map.size).toBe(0);
    expect(builder.sumIssueCounts(null)).toBe(0);
    expect(builder.sumIssueCounts([{ filePath: "no-issues.css" }])).toBe(0);
  });

  test("skips falsy file paths when tracking rule files", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      issues: [{ ruleId: "rule-a", filePath: "" }]
    });

    expect(report.byRule[0].files).toEqual([]);
    expect(report.byFile[0].filePath).toBe("");
  });

  test("sorts rule and count maps by name when counts tie", () => {
    const builder = new ReportBuilder();
    const ruleMap = new Map([
      ["rule-b", { ruleId: "rule-b", count: 1 }],
      ["rule-a", { ruleId: "rule-a", count: 1 }]
    ]);
    const countMap = new Map([
      ["team-b", 1],
      ["team-a", 1]
    ]);

    expect(builder.sortRuleCounts(ruleMap).map((entry) => entry.ruleId)).toEqual(["rule-a", "rule-b"]);
    expect(builder.sortCountMap(countMap, "teamName").map((entry) => entry.teamName)).toEqual(["team-a", "team-b"]);
  });

  test("buildFileReport defaults missing arguments", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport();

    expect(report.filePath).toBe("unknown");
    expect(report.issueCount).toBe(0);
  });

  test("sortByCount falls back to empty names when missing", () => {
    const builder = new ReportBuilder();
    const map = new Map([
      ["first", { count: 1 }],
      ["second", { count: 1 }]
    ]);

    const result = builder.sortByCount(map, (entry) => entry.count ?? 0);
    expect(result).toEqual([1, 1]);
  });

  test("sorts file report issues with empty rule ids last", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [{ url: "file-a.html" }],
      issues: [
        { ruleId: null, filePath: "file-a.html", line: 5 },
        { ruleId: "rule-b", filePath: "file-a.html", line: 5 }
      ]
    });

    expect(report.issues.map((issue) => issue.ruleId ?? "")).toEqual(["", "rule-b"]);
  });

  test("buildFileSummaries returns file index entries", () => {
    const builder = new ReportBuilder();
    const summaries = builder.buildFileSummaries({
      documents: [{ url: "file-a.html" }],
      issues: [{ ruleId: "rule-a", filePath: "file-a.html" }]
    });

    expect(summaries).toEqual([
      {
        filePath: "file-a.html",
        issueCount: 1,
        rules: [{ ruleId: "rule-a", count: 1 }],
        teams: [{ teamName: "unassigned", count: 1 }],
        severities: [{ severity: "unspecified", count: 1 }],
        checks: [{ checkId: "unknown", count: 1 }],
        linkedStylesheetsWithIssues: [],
        linkedStylesheetIssueCount: 0
      }
    ]);
  });

  test("buildFileSummaries defaults to empty arrays", () => {
    const builder = new ReportBuilder();
    const summaries = builder.buildFileSummaries();
    expect(summaries).toEqual([]);
  });

  test("sorts tie counts by name", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      documents: [],
      issues: [
        { ruleId: "rule-b", filePath: "b.html", teamName: "team-b" },
        { ruleId: "rule-a", filePath: "a.html", teamName: "team-a" }
      ]
    });

    expect(report.byFile[0].filePath).toBe("a.html");
    expect(report.byFile[1].filePath).toBe("b.html");
  });

  test("prioritizes higher counts in detailed file report", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [],
      issues: [
        { ruleId: "rule-b", teamName: "team-b", filePath: "file-a.html" },
        { ruleId: "rule-b", teamName: "team-b", filePath: "file-a.html" },
        { ruleId: "rule-a", teamName: "team-a", filePath: "file-a.html" }
      ]
    });

    expect(report.byRule).toEqual([
      { ruleId: "rule-b", count: 2 },
      { ruleId: "rule-a", count: 1 }
    ]);
    expect(report.byTeam).toEqual([
      { teamName: "team-b", count: 2 },
      { teamName: "team-a", count: 1 }
    ]);
  });

  test("sortByCount falls back to issueCount and name", () => {
    const builder = new ReportBuilder();
    const map = new Map();
    map.set("rule", { ruleId: "rule-a", count: 2 });
    map.set("file", { filePath: "b.html", issueCount: 0 });
    map.set("team", { teamName: "team-a", issueCount: 0 });
    map.set("empty", {});

    const result = builder.sortByCount(map, (entry) => ({
      name: entry.ruleId ?? entry.filePath ?? entry.teamName ?? ""
    }));

    expect(result[0].name).toBe("rule-a");
    expect(result.some((entry) => entry.name === "")).toBe(true);
  });

  test("buildFileReport fills in defaults for missing fields", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "unknown",
      documents: [],
      issues: [{ filePath: "unknown" }]
    });

    expect(report.byRule).toEqual([{ ruleId: "unknown", count: 1 }]);
    expect(report.byTeam).toEqual([{ teamName: "unassigned", count: 1 }]);
    expect(report.bySeverity).toEqual([{ severity: "unspecified", count: 1 }]);
    expect(report.byCheck).toEqual([{ checkId: "unknown", count: 1 }]);
  });

  test("sorts issues by rule id when lines match", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [],
      issues: [
        { ruleId: "rule-b", filePath: "file-a.html", line: 5 },
        { ruleId: "rule-a", filePath: "file-a.html", line: 5 }
      ]
    });

    expect(report.issues.map((issue) => issue.ruleId)).toEqual(["rule-a", "rule-b"]);
  });

  test("falls back to empty rule id when sorting", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [],
      issues: [
        { filePath: "file-a.html", line: 5 },
        { ruleId: "rule-b", filePath: "file-a.html", line: 5 }
      ]
    });

    expect(report.issues[0].ruleId ?? "").toBe("");
  });

  test("defaults missing document content type", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [{ url: "file-a.html" }],
      issues: [{ ruleId: "rule-a", filePath: "file-a.html" }]
    });

    expect(report.document).toEqual({ url: "file-a.html", contentType: null });
  });

  test("sortByCount uses name ordering when counts match", () => {
    const builder = new ReportBuilder();
    const map = new Map();
    map.set("b", { ruleId: "b", count: 1 });
    map.set("a", { ruleId: "a", count: 1 });

    const result = builder.sortByCount(map, (entry) => entry.ruleId);
    expect(result).toEqual(["a", "b"]);
  });

  test("buildFileReport defaults file path when omitted", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      documents: [],
      issues: [{}]
    });

    expect(report.filePath).toBe("unknown");
    expect(report.issueCount).toBe(1);
  });

  test("buildFileReport returns null document when missing", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: "file-a.html",
      documents: [],
      issues: []
    });

    expect(report.document).toBeNull();
  });

  test("sortRuleCounts prefers higher counts", () => {
    const builder = new ReportBuilder();
    const ruleCounts = new Map();
    ruleCounts.set("rule-a", { ruleId: "rule-a", count: 1 });
    ruleCounts.set("rule-b", { ruleId: "rule-b", count: 2 });

    const sorted = builder.sortRuleCounts(ruleCounts);
    expect(sorted[0].ruleId).toBe("rule-b");
  });

  test("sortRuleCounts uses rule id ordering for ties", () => {
    const builder = new ReportBuilder();
    const ruleCounts = new Map();
    ruleCounts.set("rule-b", { ruleId: "rule-b", count: 1 });
    ruleCounts.set("rule-a", { ruleId: "rule-a", count: 1 });

    const sorted = builder.sortRuleCounts(ruleCounts);
    expect(sorted[0].ruleId).toBe("rule-a");
  });

  test("sortCountMap uses name ordering when counts match", () => {
    const builder = new ReportBuilder();
    const counts = new Map();
    counts.set("team-b", 1);
    counts.set("team-a", 1);

    const sorted = builder.sortCountMap(counts, "teamName");
    expect(sorted[0].teamName).toBe("team-a");
  });

  test("build skips empty file paths in rule file list", () => {
    const builder = new ReportBuilder();
    const report = builder.build({
      documents: [],
      issues: [
        { ruleId: "rule-a", filePath: "", checkId: "check-1" },
        { ruleId: "rule-a", filePath: "file-a", checkId: "check-1" }
      ]
    });

    expect(report.byRule[0].files).toEqual(["file-a"]);
  });

  test("buildFileReport treats null paths as unknown", () => {
    const builder = new ReportBuilder();
    const report = builder.buildFileReport({
      filePath: null,
      documents: [{ url: "unknown" }],
      issues: [{ filePath: null, ruleId: null }]
    });

    expect(report.filePath).toBe("unknown");
    expect(report.byRule[0].ruleId).toBe("unknown");
  });

  test("sortByCount handles nullish counts and names", () => {
    const builder = new ReportBuilder();
    const map = new Map();
    map.set("null-count", { ruleId: null, count: null });
    map.set("issue-count", { filePath: "file-a", issueCount: 1 });

    const result = builder.sortByCount(map, (entry) => entry.ruleId ?? entry.filePath ?? "");
    expect(result).toEqual(["file-a", ""]);
  });
});
