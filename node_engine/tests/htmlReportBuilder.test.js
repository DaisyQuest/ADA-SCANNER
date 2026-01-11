const {
  HtmlReportBuilder,
  escapeHtml,
  normalizeToken,
  resolveSeverityVariant,
  renderBadge,
  renderBadgeList,
  renderFileLinks,
  renderIssuesTable,
  buildHtmlPage
} = require("../src/listener/HtmlReportBuilder");

describe("HtmlReportBuilder", () => {
  test("escapes HTML content", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml(null)).toBe("");
  });

  test("renders badge and file lists with fallbacks", () => {
    expect(renderBadgeList([], "ruleId")).toContain("—");
    expect(renderFileLinks([])).toContain("—");

    const badges = renderBadgeList([{ ruleId: "rule-a", count: 2 }], "ruleId", { variant: "rule" });
    expect(badges).toContain("rule-a");
    expect(badges).toContain("2");
    expect(badges).toContain("badge--rule");

    const severityBadges = renderBadgeList(
      [{ severity: "High", count: 1 }],
      "severity",
      { variantResolver: resolveSeverityVariant }
    );
    expect(severityBadges).toContain("badge--severity-high");

    const files = renderFileLinks(["file-a.html"]);
    expect(files).toContain("file-a.html");
  });

  test("normalizes tokens and renders standalone badges", () => {
    expect(normalizeToken("High Priority")).toBe("high-priority");
    expect(resolveSeverityVariant("High")).toBe("severity-high");
    expect(resolveSeverityVariant("Medium")).toBe("severity-medium");
    expect(resolveSeverityVariant("Low")).toBe("severity-low");
    expect(resolveSeverityVariant("")).toBe("severity-unknown");

    const badge = renderBadge("Team A", null, "team");
    expect(badge).toContain("badge--team");
    expect(badge).toContain("Team A");
  });

  test("renders issue table with details and empty state", () => {
    const html = renderIssuesTable([
      {
        ruleId: "rule-a",
        message: "Missing label",
        teamName: "team-a",
        severity: "high",
        line: 4,
        evidence: "<input>",
        recommendation: "Add a label"
      }
    ]);

    expect(html).toContain("Missing label");
    expect(html).toContain("Add a label");
    expect(html).toContain("badge--severity-high");
    expect(html).toContain("badge--team");
    expect(html).toContain("table-wrapper");

    const emptyHtml = renderIssuesTable([]);
    expect(emptyHtml).toContain("No issues found");
  });

  test("renders issue table with missing evidence and recommendation", () => {
    const html = renderIssuesTable([
      { ruleId: "rule-a", message: "Issue", teamName: "team-a", severity: "low", line: null }
    ]);
    expect(html).toContain("Issue");
    expect(html).toContain("—");
  });

  test("builds a full HTML report", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildReport({
      report: {
        summary: { documents: 1, issues: 2, files: 1, rules: 1, teams: 1, checks: 1 },
        byRule: [
          {
            ruleId: "rule-a",
            description: "desc",
            severity: "high",
            teamName: "team-a",
            count: 2,
            files: ["file-a.html"],
            checks: ["check-a"]
          }
        ],
        byFile: [
          {
            filePath: "file-a.html",
            issueCount: 2,
            rules: [{ ruleId: "rule-a", count: 2 }],
            severities: [{ severity: "high", count: 2 }],
            teams: [{ teamName: "team-a", count: 2 }]
          }
        ],
        byTeam: [{ teamName: "team-a", issueCount: 2, rules: [{ ruleId: "rule-a", count: 2 }] }],
        bySeverity: [{ severity: "high", count: 2 }],
        byCheck: [{ checkId: "check-a", count: 2 }]
      }
    });

    expect(html).toContain("Runtime Accessibility Report");
    expect(html).toContain("rule-a");
    expect(html).toContain("badge--severity-high");
    expect(html).toContain("Severity breakdown");
    expect(html).toContain("Checks triggered");
    expect(html).toContain("meta-pill");
  });

  test("builds a report with empty sections", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildReport({ report: { summary: { documents: 0, issues: 0, files: 0 } } });
    expect(html).toContain("No rule violations recorded");
    expect(html).toContain("No file-level issues recorded");
    expect(html).toContain("No team impacts recorded");
  });

  test("builds a report with fallback team and severity labels", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildReport({
      report: {
        summary: { documents: 1, issues: 1, files: 1, rules: 1, teams: 1, checks: 1 },
        byRule: [
          {
            ruleId: "rule-x",
            description: "desc",
            severity: "",
            teamName: "",
            count: 1,
            files: [],
            checks: []
          }
        ],
        byFile: [
          {
            filePath: "file-x.html",
            issueCount: 1,
            rules: [],
            severities: [],
            teams: []
          }
        ],
        byTeam: [{ teamName: "", issueCount: 1, rules: [] }],
        bySeverity: [],
        byCheck: []
      }
    });

    expect(html).toContain("Unassigned");
    expect(html).toContain("n/a");
  });

  test("builds a report when report payload is missing", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildReport({});
    expect(html).toContain("Runtime Accessibility Report");
  });

  test("builds a file HTML report with defaults", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildFileReport({
      report: {
        filePath: "file-a.html",
        issueCount: 1,
        document: { contentType: "text/html" },
        issues: [{ ruleId: "rule-a", message: "Issue" }],
        byRule: [{ ruleId: "rule-a", count: 1 }],
        linkedStylesheetsWithIssues: []
      }
    });

    expect(html).toContain("File Accessibility Report");
    expect(html).toContain("file-a.html");
    expect(html).toContain("summary-value--mono");
  });

  test("builds a file HTML report with linked stylesheet issues", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildFileReport({
      report: {
        filePath: "file-c.html",
        issueCount: 0,
        document: { contentType: "text/html" },
        linkedStylesheetsWithIssues: [
          { filePath: "styles.css", count: 2 },
          { filePath: "theme.css", count: 1 }
        ]
      }
    });

    expect(html).toContain("Linked stylesheet issues");
    expect(html).toContain("styles.css");
    expect(html).toContain("theme.css");
    expect(html).toContain("badge--file");
  });

  test("builds a file HTML report without rule data", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildFileReport({ report: { filePath: "file-b.html", issueCount: 0 } });
    expect(html).toContain("No rule data available");
    expect(html).toContain("file-b.html");
  });

  test("builds a file HTML report with null summary fields", () => {
    const builder = new HtmlReportBuilder();
    const html = builder.buildFileReport({ report: { filePath: null, issueCount: null, document: {} } });
    expect(html).toContain("unknown");
    expect(html).toContain("n/a");
  });

  test("buildHtmlPage renders sections", () => {
    const html = buildHtmlPage({
      title: "Title",
      summaryHtml: "<section>Summary</section>",
      sectionsHtml: "<section>Body</section>"
    });

    expect(html).toContain("Summary");
    expect(html).toContain("Body");
  });
});
