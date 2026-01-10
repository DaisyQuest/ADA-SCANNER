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
  formatGoldMasterComparison
};
