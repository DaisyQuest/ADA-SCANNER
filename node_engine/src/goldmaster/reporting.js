const fs = require("fs");
const path = require("path");
const ensureDirectory = (dirPath) => {
  if (!dirPath) {
    return false;
  }
  fs.mkdirSync(dirPath, { recursive: true });
  return true;
};

const normalizeGoldMasterSummary = (payload = {}) => {
  if (payload.summary && Array.isArray(payload.summary.results)) {
    return payload.summary;
  }
  if (Array.isArray(payload.results)) {
    return payload;
  }
  return { results: [] };
};

const calculateSummaryTotals = (summary = {}) => {
  const results = Array.isArray(summary.results) ? summary.results : [];
  const totalExtensions = Number.isFinite(summary.totalExtensions) ? summary.totalExtensions : results.length;
  const totalDocuments = Number.isFinite(summary.totalDocuments)
    ? summary.totalDocuments
    : results.reduce((total, entry) => total + (entry.documentCount ?? 0), 0);
  const totalIssues = Number.isFinite(summary.totalIssues)
    ? summary.totalIssues
    : results.reduce((total, entry) => total + (entry.issueCount ?? 0), 0);
  return { totalExtensions, totalDocuments, totalIssues };
};

const saveGoldMasterReport = ({ savePath, summary, reports }) => {
  if (!savePath) {
    throw new Error("savePath is required.");
  }
  const dir = path.dirname(savePath);
  if (dir) {
    ensureDirectory(dir === "." ? "" : dir);
  }
  const payload = {
    summary,
    reports: Array.isArray(reports) ? reports : []
  };
  fs.writeFileSync(savePath, JSON.stringify(payload, null, 2));
  return savePath;
};

const loadGoldMasterReport = (reportPath) => {
  if (!reportPath) {
    throw new Error("reportPath is required.");
  }
  const raw = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(raw);
};

const compareGoldMasterReports = ({ baseline, current }) => {
  const baselineSummary = normalizeGoldMasterSummary(baseline);
  const currentSummary = normalizeGoldMasterSummary(current);
  const baselineTotals = calculateSummaryTotals(baselineSummary);
  const currentTotals = calculateSummaryTotals(currentSummary);

  const baselineMap = new Map(
    (baselineSummary.results || []).map((entry) => [entry.extension, entry])
  );
  const currentMap = new Map(
    (currentSummary.results || []).map((entry) => [entry.extension, entry])
  );

  const extensions = new Set([...baselineMap.keys(), ...currentMap.keys()]);
  const extensionDiffs = [];
  let added = 0;
  let removed = 0;
  let changed = 0;
  let unchanged = 0;

  for (const extension of Array.from(extensions).sort()) {
    const baselineResult = baselineMap.get(extension) || null;
    const currentResult = currentMap.get(extension) || null;
    const baselineDocuments = baselineResult?.documentCount ?? 0;
    const currentDocuments = currentResult?.documentCount ?? 0;
    const baselineIssues = baselineResult?.issueCount ?? 0;
    const currentIssues = currentResult?.issueCount ?? 0;
    const deltaDocuments = currentDocuments - baselineDocuments;
    const deltaIssues = currentIssues - baselineIssues;

    let status = "unchanged";
    if (!baselineResult && currentResult) {
      status = "added";
      added += 1;
    } else if (baselineResult && !currentResult) {
      status = "removed";
      removed += 1;
    } else if (
      baselineResult?.status !== currentResult?.status ||
      deltaDocuments !== 0 ||
      deltaIssues !== 0
    ) {
      status = "changed";
      changed += 1;
    } else {
      unchanged += 1;
    }

    extensionDiffs.push({
      extension,
      status,
      baseline: baselineResult,
      current: currentResult,
      deltaDocuments,
      deltaIssues
    });
  }

  return {
    baseline: {
      generatedAt: baselineSummary.generatedAt ?? null,
      ...baselineTotals
    },
    current: {
      generatedAt: currentSummary.generatedAt ?? null,
      ...currentTotals
    },
    totals: {
      added,
      removed,
      changed,
      unchanged
    },
    extensions: extensionDiffs
  };
};

const formatGoldMasterSummary = (summary = {}) => {
  const totals = calculateSummaryTotals(summary);
  const lines = [
    `GoldMaster summary: ${totals.totalExtensions} extensions, ${totals.totalDocuments} documents, ${totals.totalIssues} issues`
  ];
  const results = Array.isArray(summary.results) ? summary.results : [];
  for (const result of results) {
    lines.push(
      `- ${result.extension}: ${result.status} (${result.documentCount} documents, ${result.issueCount} issues)`
    );
  }
  return lines;
};

const normalizeExpectationsTotals = (totals = {}) => ({
  totalDocuments: Number.isFinite(totals.totalDocuments) ? totals.totalDocuments : 0,
  matched: Number.isFinite(totals.matched) ? totals.matched : 0,
  mismatched: Number.isFinite(totals.mismatched) ? totals.mismatched : 0,
  missing: Number.isFinite(totals.missing) ? totals.missing : 0,
  invalid: Number.isFinite(totals.invalid) ? totals.invalid : 0,
  skipped: Number.isFinite(totals.skipped) ? totals.skipped : 0
});

const formatGoldMasterExpectations = (expectations = {}) => {
  const totals = normalizeExpectationsTotals(expectations.totals);
  const lines = [
    `GoldMaster expectations: ${totals.matched} matched, ${totals.mismatched} mismatched, ${totals.missing} missing, ${totals.invalid} invalid, ${totals.skipped} skipped`
  ];
  const extensions = Array.isArray(expectations.extensions) ? expectations.extensions : [];
  for (const extension of extensions) {
    const extensionTotals = normalizeExpectationsTotals(extension);
    lines.push(
      `- ${extension.extension}: ${extensionTotals.matched} matched, ${extensionTotals.mismatched} mismatched, ${extensionTotals.missing} missing, ${extensionTotals.invalid} invalid, ${extensionTotals.skipped} skipped`
    );
    const failures = Array.isArray(extension.results)
      ? extension.results.filter((entry) => entry.status !== "match" && entry.status !== "skipped")
      : [];
    for (const failure of failures) {
      if (failure.status === "mismatch") {
        lines.push(
          `  ! ${failure.documentPath}: missing=${JSON.stringify(failure.missing)}, unexpected=${JSON.stringify(failure.unexpected)}`
        );
        continue;
      }
      lines.push(`  ! ${failure.documentPath}: ${failure.message ?? "Expectation mismatch."}`);
    }
  }
  return lines;
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderGoldMasterExpectationsHtml = (expectations = {}) => {
  const totals = normalizeExpectationsTotals(expectations.totals);
  const extensions = Array.isArray(expectations.extensions) ? expectations.extensions : [];
  const extensionBlocks = extensions
    .map((extension) => {
      const extensionTotals = normalizeExpectationsTotals(extension);
      const rows = Array.isArray(extension.results)
        ? extension.results.map((entry) => {
          const missing = entry.missing ? JSON.stringify(entry.missing) : "";
          const unexpected = entry.unexpected ? JSON.stringify(entry.unexpected) : "";
          return `<tr class="status-${escapeHtml(entry.status)}">
            <td>${escapeHtml(entry.documentPath ?? "unknown")}</td>
            <td><span class="status-pill status-${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span></td>
            <td>${escapeHtml(entry.expectationPath ?? "")}</td>
            <td>${escapeHtml(missing)}</td>
            <td>${escapeHtml(unexpected)}</td>
            <td>${escapeHtml(entry.message ?? "")}</td>
          </tr>`;
        }).join("")
        : "";
      return `<section class="panel">
        <div class="section-header">
          <div>
            <h2>${escapeHtml(extension.extension)} expectations</h2>
            <p class="muted">${extensionTotals.matched} matched, ${extensionTotals.mismatched} mismatched, ${extensionTotals.missing} missing, ${extensionTotals.invalid} invalid, ${extensionTotals.skipped} skipped</p>
          </div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Status</th>
                <th>Expectation File</th>
                <th>Missing Rules</th>
                <th>Unexpected Rules</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6">No expectation results.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>`;
    })
    .join("");
  const summaryBlock = `<section class="panel summary">
    <div class="summary-header">
      <div>
        <h1>GoldMaster Expectations Summary</h1>
        <p class="muted">Consolidated outcome of GoldMaster expectation coverage.</p>
      </div>
      <div class="summary-badges">
        <span class="pill">Total docs: ${totals.totalDocuments}</span>
        <span class="pill">Matched: ${totals.matched}</span>
        <span class="pill">Mismatched: ${totals.mismatched}</span>
        <span class="pill">Missing: ${totals.missing}</span>
        <span class="pill">Invalid: ${totals.invalid}</span>
        <span class="pill">Skipped: ${totals.skipped}</span>
      </div>
    </div>
  </section>`;
  const content = extensionBlocks || `<p>No expectation results available.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GoldMaster Expectations Summary</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f8fb;
      --panel: #ffffff;
      --text: #1a1f2c;
      --muted: #5d6b82;
      --border: #e2e7f0;
      --accent: #1f4fd6;
      --shadow: 0 16px 28px rgba(23, 32, 49, 0.08);
    }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; margin: 0; color: var(--text); background: var(--bg); }
    header { padding: 28px 32px 20px; border-bottom: 1px solid var(--border); background: linear-gradient(120deg, #ffffff 0%, #eef3ff 100%); }
    main { padding: 24px 32px 40px; display: flex; flex-direction: column; gap: 20px; max-width: 1200px; margin: 0 auto; }
    h1, h2 { margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-top: 1px solid var(--border); padding: 12px 14px; text-align: left; vertical-align: top; }
    th { background: #f2f6ff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-top: none; }
    .panel { background: var(--panel); border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--shadow); padding: 18px 20px; }
    .summary { border-left: 4px solid var(--accent); }
    .summary-header { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .summary-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill { background: #eff4ff; border: 1px solid var(--border); border-radius: 999px; padding: 6px 12px; font-size: 12px; color: var(--muted); font-weight: 600; }
    .table-wrapper { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
    .muted { color: var(--muted); margin: 4px 0 0; }
    .status-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; }
    .status-match { background: #e9f7ef; }
    .status-mismatch { background: #fff4e5; }
    .status-missing, .status-invalid { background: #fdecea; }
    .status-skipped { background: #f4f6f8; }
    .status-pill.status-match { color: #15803d; border-color: rgba(21, 128, 61, 0.2); }
    .status-pill.status-mismatch { color: #b45309; border-color: rgba(180, 83, 9, 0.2); }
    .status-pill.status-missing, .status-pill.status-invalid { color: #b91c1c; border-color: rgba(185, 28, 28, 0.2); }
    .status-pill.status-skipped { color: #475569; border-color: rgba(71, 85, 105, 0.2); }
  </style>
</head>
<body>
  <header>
    <h1>GoldMaster Expectations Summary</h1>
    <p class="muted">Generated by ADA Scanner GoldMaster.</p>
  </header>
  <main>
    ${summaryBlock}
    ${content}
  </main>
</body>
</html>`;
};

const formatGoldMasterComparison = (comparison) => {
  const lines = [
    `GoldMaster comparison: ${comparison.totals.added} added, ${comparison.totals.removed} removed, ${comparison.totals.changed} changed, ${comparison.totals.unchanged} unchanged`
  ];
  for (const entry of comparison.extensions) {
    if (entry.status === "unchanged") {
      continue;
    }
    if (entry.status === "added") {
      lines.push(
        `+ ${entry.extension}: ${entry.current?.status ?? "unknown"} (${entry.current?.documentCount ?? 0} documents, ${entry.current?.issueCount ?? 0} issues)`
      );
      continue;
    }
    if (entry.status === "removed") {
      lines.push(
        `- ${entry.extension}: ${entry.baseline?.status ?? "unknown"} (${entry.baseline?.documentCount ?? 0} documents, ${entry.baseline?.issueCount ?? 0} issues)`
      );
      continue;
    }
    lines.push(
      `~ ${entry.extension}: ${entry.baseline?.status ?? "unknown"} → ${entry.current?.status ?? "unknown"} (${entry.deltaDocuments} documents, ${entry.deltaIssues} issues)`
    );
  }
  return lines;
};

module.exports = {
  normalizeGoldMasterSummary,
  calculateSummaryTotals,
  saveGoldMasterReport,
  loadGoldMasterReport,
  compareGoldMasterReports,
  formatGoldMasterSummary,
  formatGoldMasterExpectations,
  renderGoldMasterExpectationsHtml,
  formatGoldMasterComparison
};
