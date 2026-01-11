const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  normalizeGoldMasterSummary,
  calculateSummaryTotals,
  saveGoldMasterReport,
  loadGoldMasterReport,
  compareGoldMasterReports,
  formatGoldMasterSummary,
  formatGoldMasterExpectations,
  renderGoldMasterExpectationsHtml,
  formatGoldMasterComparison
} = require("../src/goldmaster/reporting");

describe("goldmaster reporting helpers", () => {
  test("normalizes summaries from raw payloads", () => {
    const summary = { results: [{ extension: ".html", documentCount: 1, issueCount: 2 }] };
    expect(normalizeGoldMasterSummary({ summary })).toEqual(summary);
    expect(normalizeGoldMasterSummary(summary)).toEqual(summary);
    expect(normalizeGoldMasterSummary({})).toEqual({ results: [] });
  });

  test("calculates totals when fields are missing", () => {
    const summary = {
      results: [
        { extension: ".html", documentCount: 2, issueCount: 3 },
        { extension: ".razor", documentCount: 1, issueCount: 0 }
      ]
    };
    expect(calculateSummaryTotals(summary)).toEqual({
      totalExtensions: 2,
      totalDocuments: 3,
      totalIssues: 3
    });
  });

  test("honors explicit totals and handles missing results arrays", () => {
    const summary = {
      totalExtensions: 4,
      totalDocuments: 10,
      totalIssues: 8,
      results: "not-an-array"
    };
    expect(calculateSummaryTotals(summary)).toEqual({
      totalExtensions: 4,
      totalDocuments: 10,
      totalIssues: 8
    });
  });

  test("saves and loads report bundles", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-report-"));
    const savePath = path.join(tmpDir, "report.json");
    const summary = { results: [{ extension: ".html", documentCount: 1, issueCount: 0 }] };
    const reports = [{ extension: ".html", report: { summary: { documents: 1, issues: 0 } } }];

    const savedPath = saveGoldMasterReport({ savePath, summary, reports });
    expect(savedPath).toBe(savePath);

    const loaded = loadGoldMasterReport(savePath);
    expect(loaded.summary).toEqual(summary);
    expect(loaded.reports).toEqual(reports);
  });

  test("defaults missing report arrays when saving", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-report-empty-"));
    const savePath = path.join(tmpDir, "report.json");
    saveGoldMasterReport({ savePath, summary: { results: [] }, reports: null });
    const loaded = loadGoldMasterReport(savePath);
    expect(loaded.reports).toEqual([]);
  });

  test("saves reports to the current directory when no folder is provided", () => {
    const savePath = `gm-report-${Date.now()}.json`;
    try {
      saveGoldMasterReport({ savePath, summary: { results: [] }, reports: [] });
      expect(fs.existsSync(savePath)).toBe(true);
    } finally {
      if (fs.existsSync(savePath)) {
        fs.unlinkSync(savePath);
      }
    }
  });

  test("throws when save/load paths are missing", () => {
    expect(() => saveGoldMasterReport({ savePath: "", summary: {}, reports: [] })).toThrow("savePath is required.");
    expect(() => loadGoldMasterReport("")).toThrow("reportPath is required.");
  });

  test("compares summaries and formats diffs", () => {
    const baseline = {
      summary: {
        generatedAt: "2024-01-01T00:00:00.000Z",
        results: [
          { extension: ".html", status: "complete", documentCount: 1, issueCount: 2 },
          { extension: ".razor", status: "missing", documentCount: 0, issueCount: 0 },
          { extension: ".xaml", status: "complete", documentCount: 1, issueCount: 0 }
        ]
      }
    };
    const current = {
      summary: {
        generatedAt: "2024-01-02T00:00:00.000Z",
        results: [
          { extension: ".html", status: "complete", documentCount: 2, issueCount: 1 },
          { extension: ".htm", status: "complete", documentCount: 1, issueCount: 0 },
          { extension: ".xaml", status: "complete", documentCount: 1, issueCount: 0 }
        ]
      }
    };

    const comparison = compareGoldMasterReports({ baseline, current });
    expect(comparison.totals.added).toBe(1);
    expect(comparison.totals.removed).toBe(1);
    expect(comparison.totals.changed).toBe(1);
    expect(comparison.totals.unchanged).toBe(1);
    expect(comparison.extensions.find((entry) => entry.extension === ".html").deltaDocuments).toBe(1);

    const summaryLines = formatGoldMasterSummary(current.summary);
    expect(summaryLines[0]).toContain("GoldMaster summary:");
    expect(summaryLines[1]).toContain(".html");

    const comparisonLines = formatGoldMasterComparison(comparison);
    expect(comparisonLines[0]).toContain("GoldMaster comparison:");
    expect(comparisonLines.some((line) => line.startsWith("+ .htm"))).toBe(true);
  });

  test("formats added, removed, and changed entries explicitly", () => {
    const comparison = {
      totals: { added: 1, removed: 1, changed: 1, unchanged: 0 },
      extensions: [
        { extension: ".html", status: "changed", deltaDocuments: 1, deltaIssues: -1, baseline: { status: "complete" }, current: { status: "complete" } },
        { extension: ".htm", status: "added", current: { status: "complete", documentCount: 1, issueCount: 0 } },
        { extension: ".razor", status: "removed", baseline: { status: "missing", documentCount: 0, issueCount: 0 } }
      ]
    };

    const lines = formatGoldMasterComparison(comparison);
    expect(lines.some((line) => line.startsWith("~ .html"))).toBe(true);
    expect(lines.some((line) => line.startsWith("+ .htm"))).toBe(true);
    expect(lines.some((line) => line.startsWith("- .razor"))).toBe(true);
  });

  test("formats expectation summaries and failures", () => {
    const expectations = {
      totals: { totalDocuments: 4, matched: 1, mismatched: 1, missing: 2, invalid: 0, skipped: 1 },
      extensions: [
        {
          extension: ".html",
          matched: 1,
          mismatched: 1,
          missing: 2,
          invalid: 0,
          skipped: 0,
          results: [
            { documentPath: "doc-1.html", status: "match" },
            { documentPath: "doc-2.html", status: "mismatch", missing: ["rule-a"], unexpected: ["rule-b"] },
            { documentPath: "doc-3.html", status: "missing", message: "Missing GoldMaster expectations for doc-3.html." },
            { documentPath: "doc-4.html", status: "missing" }
          ]
        }
      ]
    };

    const lines = formatGoldMasterExpectations(expectations);
    expect(lines[0]).toContain("GoldMaster expectations");
    expect(lines.some((line) => line.includes(".html"))).toBe(true);
    expect(lines.some((line) => line.includes("doc-2.html"))).toBe(true);
    expect(lines.some((line) => line.includes("doc-3.html"))).toBe(true);
    expect(lines.some((line) => line.includes("doc-4.html"))).toBe(true);
  });

  test("formats expectations when extensions or results are missing arrays", () => {
    const lines = formatGoldMasterExpectations({
      totals: { matched: "nope", mismatched: null },
      extensions: [{ extension: ".html", results: null }]
    });
    expect(lines[0]).toContain("GoldMaster expectations");
    expect(lines.some((line) => line.includes(".html"))).toBe(true);
  });

  test("renders expectations html with empty content fallback", () => {
    const html = renderGoldMasterExpectationsHtml({ totals: {}, extensions: [] });
    expect(html).toContain("GoldMaster Expectations Summary");
    expect(html).toContain("No expectation results available");
    expect(html).toContain("Total docs:");
  });

  test("renders expectations html tables with results", () => {
    const html = renderGoldMasterExpectationsHtml({
      totals: { totalDocuments: 1, matched: 1, mismatched: 0, missing: 0, invalid: 0, skipped: 0 },
      extensions: [
        {
          extension: ".html",
          matched: 1,
          mismatched: 0,
          missing: 0,
          invalid: 0,
          skipped: 0,
          results: [
            {
              documentPath: "doc.html",
              status: "match",
              expectationPath: "/tmp/doc.expectations.json",
              missing: ["rule-a"],
              unexpected: ["rule-b"]
            }
          ]
        }
      ]
    });
    expect(html).toContain("doc.html");
    expect(html).toContain("/tmp/doc.expectations.json");
    expect(html).toContain("status-match");
    expect(html).toContain("status-pill");
  });

  test("renders expectations html tables with empty extension results", () => {
    const html = renderGoldMasterExpectationsHtml({
      totals: { matched: 0, mismatched: 0, missing: 0, invalid: 0, skipped: 0 },
      extensions: [
        {
          extension: ".html",
          matched: 0,
          mismatched: 0,
          missing: 0,
          invalid: 0,
          skipped: 0,
          results: null
        }
      ]
    });
    expect(html).toContain("No expectation results.");
  });
});
