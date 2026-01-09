const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeList = (items) => (Array.isArray(items) ? items : []);

const normalizeToken = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";

const resolveSeverityVariant = (severity) => {
  const normalized = normalizeToken(severity);
  if (["critical", "high"].includes(normalized)) {
    return "severity-high";
  }
  if (["medium", "moderate"].includes(normalized)) {
    return "severity-medium";
  }
  if (["low", "minor"].includes(normalized)) {
    return "severity-low";
  }
  return "severity-unknown";
};

const renderBadge = (label, count, variant = "rule") => {
  const safeLabel = label?.toString().trim() || "Unknown";
  const countHtml = Number.isFinite(count)
    ? `<span class="badge-count">${escapeHtml(count)}</span>`
    : "";
  return `
    <span class="badge badge--${variant}">
      <span class="badge-label">${escapeHtml(safeLabel)}</span>
      ${countHtml}
    </span>
  `;
};

const renderBadgeList = (items, labelKey, { countKey = "count", variant = "rule", variantResolver } = {}) => {
  const list = normalizeList(items);
  if (!list.length) {
    return "<span class=\"muted\">—</span>";
  }

  return list
    .map((item) => {
      const resolvedVariant = variantResolver
        ? variantResolver(item[labelKey])
        : variant;
      return renderBadge(item[labelKey], item[countKey], resolvedVariant);
    })
    .join("");
};

const renderFileLinks = (files) => {
  const list = normalizeList(files);
  if (!list.length) {
    return "<span class=\"muted\">—</span>";
  }

  return list.map((file) => `<span class="pill">${escapeHtml(file)}</span>`).join("");
};

const renderIssuesTable = (issues) => {
  const rows = normalizeList(issues)
    .map((issue) => {
      const evidence = issue.evidence ? escapeHtml(issue.evidence) : "—";
      const recommendation = issue.recommendation ? escapeHtml(issue.recommendation) : "—";
      const teamBadge = renderBadge(issue.teamName ?? "unassigned", null, "team");
      const severityBadge = renderBadge(
        issue.severity ?? "unspecified",
        null,
        resolveSeverityVariant(issue.severity)
      );
      return `
        <tr>
          <td>${escapeHtml(issue.ruleId ?? "unknown")}</td>
          <td>${escapeHtml(issue.message ?? "")}</td>
          <td>${teamBadge}</td>
          <td>${severityBadge}</td>
          <td>${escapeHtml(issue.line ?? "—")}</td>
          <td>
            <details>
              <summary>View</summary>
              <div class="detail-block">
                <div><strong>Evidence</strong></div>
                <code>${evidence}</code>
                <div class="detail-label"><strong>Recommendation</strong></div>
                <div>${recommendation}</div>
              </div>
            </details>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Rule</th>
          <th>Message</th>
          <th>Team</th>
          <th>Severity</th>
          <th>Line</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `
          <tr>
            <td colspan="6" class="muted">No issues found for this file.</td>
          </tr>
        `}
      </tbody>
    </table>
  `;
};

const buildHtmlPage = ({ title, summaryHtml, sectionsHtml }) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
      <style>
        :root {
          color-scheme: light;
          --bg: #f6f8fb;
          --panel: #ffffff;
          --text: #1a1f2c;
          --muted: #5d6b82;
          --primary: #1f4fd6;
          --primary-soft: #e0e9ff;
          --border: #e2e7f0;
          --shadow: 0 12px 24px rgba(23, 32, 49, 0.08);
          --success: #16a34a;
          --warning: #f59e0b;
          --danger: #ef4444;
        }

        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          background: var(--bg);
          color: var(--text);
        }
        header {
          padding: 28px 40px 20px;
          background: linear-gradient(120deg, #ffffff 0%, #eef3ff 100%);
          border-bottom: 1px solid var(--border);
        }
        header h1 {
          margin: 0 0 6px;
          font-size: 24px;
        }
        header p {
          margin: 0;
          color: var(--muted);
        }
        main {
          padding: 24px 40px 48px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .summary-card {
          background: var(--panel);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
        }
        .summary-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-top: 4px solid var(--primary);
          opacity: 0.2;
          pointer-events: none;
        }
        .summary-label {
          font-size: 13px;
          color: var(--muted);
        }
        .summary-value {
          font-size: 26px;
          font-weight: 700;
          margin-top: 6px;
        }
        section {
          background: var(--panel);
          border-radius: 16px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          padding: 18px 20px 22px;
        }
        section h2 {
          margin: 0 0 12px;
          font-size: 18px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .data-table th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
          padding: 10px 0;
        }
        .data-table td {
          padding: 10px 0;
          border-top: 1px solid var(--border);
          vertical-align: top;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--primary-soft);
          color: var(--primary);
          font-size: 12px;
          font-weight: 600;
          margin: 2px 4px 2px 0;
        }
        .badge--rule {
          background: #e0f2fe;
          color: #0369a1;
          border-color: rgba(3, 105, 161, 0.2);
        }
        .badge--team {
          background: #ede9fe;
          color: #6d28d9;
          border-color: rgba(109, 40, 217, 0.2);
        }
        .badge--file {
          background: #fef9c3;
          color: #a16207;
          border-color: rgba(161, 98, 7, 0.2);
        }
        .badge--count {
          background: #ecfccb;
          color: #3f6212;
          border-color: rgba(63, 98, 18, 0.2);
        }
        .badge--severity-high,
        .badge--severity-critical {
          background: #fee2e2;
          color: #b91c1c;
          border-color: rgba(185, 28, 28, 0.2);
        }
        .badge--severity-medium {
          background: #fef3c7;
          color: #b45309;
          border-color: rgba(180, 83, 9, 0.2);
        }
        .badge--severity-low {
          background: #dcfce7;
          color: #15803d;
          border-color: rgba(21, 128, 61, 0.2);
        }
        .badge--severity-unknown {
          background: #e2e8f0;
          color: #475569;
          border-color: rgba(71, 85, 105, 0.2);
        }
        .badge-count {
          background: #e4e9fb;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 11px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fbfcff;
          font-size: 12px;
          margin: 2px 4px 2px 0;
        }
        .muted { color: var(--muted); }
        code {
          display: block;
          white-space: pre-wrap;
          background: #f5f6fa;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
          margin: 8px 0;
          color: #2f3b55;
          font-size: 12px;
        }
        details summary {
          cursor: pointer;
          color: var(--primary);
          font-weight: 600;
        }
        .detail-block {
          margin-top: 8px;
        }
        .detail-label {
          margin-top: 8px;
        }
        footer {
          padding: 16px 40px;
          color: var(--muted);
          font-size: 12px;
          border-top: 1px solid var(--border);
          background: var(--panel);
        }
        @media (max-width: 720px) {
          header, main, footer { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${escapeHtml(title)}</h1>
        <p>ADA Scanner runtime report</p>
      </header>
      <main>
        ${summaryHtml}
        ${sectionsHtml}
      </main>
      <footer>Generated by ADA Scanner.</footer>
    </body>
  </html>
`;

class HtmlReportBuilder {
  buildReport({ report }) {
    const summarySource = report?.summary ?? {};
    const summary = {
      documents: summarySource.documents ?? 0,
      issues: summarySource.issues ?? 0,
      files: summarySource.files ?? 0,
      rules: summarySource.rules ?? 0,
      teams: summarySource.teams ?? 0,
      checks: summarySource.checks ?? 0
    };
    const summaryHtml = `
      <section>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Documents scanned</div>
            <div class="summary-value">${escapeHtml(summary.documents)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total issues</div>
            <div class="summary-value">${escapeHtml(summary.issues)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Rules triggered</div>
            <div class="summary-value">${escapeHtml(summary.rules)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Teams impacted</div>
            <div class="summary-value">${escapeHtml(summary.teams)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Files with issues</div>
            <div class="summary-value">${escapeHtml(summary.files)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Checks triggered</div>
            <div class="summary-value">${escapeHtml(summary.checks)}</div>
          </div>
        </div>
      </section>
    `;

    const ruleRows = normalizeList(report?.byRule).map((rule) => `
      <tr>
        <td>
          <strong>${escapeHtml(rule.ruleId)}</strong>
          <div class="muted">${escapeHtml(rule.description)}</div>
        </td>
        <td>${renderBadge(rule.teamName || "Unassigned", null, "team")}</td>
        <td>${renderBadge(rule.severity || "n/a", null, resolveSeverityVariant(rule.severity))}</td>
        <td>${renderBadge("Issues", rule.count, "count")}</td>
        <td>${renderFileLinks(rule.files)}</td>
      </tr>
    `).join("");

    const fileRows = normalizeList(report?.byFile).map((file) => `
      <tr>
        <td>${escapeHtml(file.filePath)}</td>
        <td>${escapeHtml(file.issueCount)}</td>
        <td>${renderBadgeList(file.rules, "ruleId", { variant: "rule" })}</td>
        <td>${renderBadgeList(file.severities, "severity", { variantResolver: resolveSeverityVariant })}</td>
        <td>${renderBadgeList(file.teams, "teamName", { variant: "team" })}</td>
        <td>${renderBadgeList(file.linkedStylesheetsWithIssues, "filePath", { variant: "file" })}</td>
      </tr>
    `).join("");

    const teamRows = normalizeList(report?.byTeam).map((team) => `
      <tr>
        <td>${escapeHtml(team.teamName)}</td>
        <td>${escapeHtml(team.issueCount)}</td>
        <td>${renderBadgeList(team.rules, "ruleId", { variant: "rule" })}</td>
      </tr>
    `).join("");

    const sectionsHtml = `
      <section>
        <h2>Rule violations</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Team</th>
              <th>Severity</th>
              <th>Issues</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            ${ruleRows || `
              <tr>
                <td colspan="5" class="muted">No rule violations recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Files with violations</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Issues</th>
              <th>Top rules</th>
              <th>Severities</th>
              <th>Teams</th>
              <th>Stylesheets with issues</th>
            </tr>
          </thead>
          <tbody>
            ${fileRows || `
              <tr>
                <td colspan="6" class="muted">No file-level issues recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Team impact</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Issues</th>
              <th>Rules</th>
            </tr>
          </thead>
          <tbody>
            ${teamRows || `
              <tr>
                <td colspan="3" class="muted">No team impacts recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </section>
      <section>
        <h2>Severity breakdown</h2>
        ${renderBadgeList(report?.bySeverity, "severity", { variantResolver: resolveSeverityVariant })}
      </section>
      <section>
        <h2>Checks triggered</h2>
        ${renderBadgeList(report?.byCheck, "checkId", { variant: "rule" })}
      </section>
    `;

    return buildHtmlPage({
      title: "Runtime Accessibility Report",
      summaryHtml,
      sectionsHtml
    });
  }

  buildFileReport({ report }) {
    const summaryHtml = `
      <section>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">File</div>
            <div class="summary-value">${escapeHtml(report?.filePath ?? "unknown")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Issues</div>
            <div class="summary-value">${escapeHtml(report?.issueCount ?? 0)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Content type</div>
            <div class="summary-value">${escapeHtml(report?.document?.contentType ?? "n/a")}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Stylesheets with issues</div>
            <div class="summary-value">${escapeHtml(report?.linkedStylesheetsWithIssues?.length ?? 0)}</div>
          </div>
        </div>
      </section>
    `;

    const sectionsHtml = `
      <section>
        <h2>Issues</h2>
        ${renderIssuesTable(report?.issues)}
      </section>
      <section>
        <h2>Linked stylesheet issues</h2>
        ${renderBadgeList(report?.linkedStylesheetsWithIssues, "filePath", { variant: "file" })}
      </section>
      <section>
        <h2>Rule breakdown</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${normalizeList(report?.byRule).map((entry) => `
              <tr>
                <td>${escapeHtml(entry.ruleId)}</td>
                <td>${escapeHtml(entry.count)}</td>
              </tr>
            `).join("") || `
              <tr>
                <td colspan="2" class="muted">No rule data available.</td>
              </tr>
            `}
          </tbody>
        </table>
      </section>
    `;

    return buildHtmlPage({
      title: "File Accessibility Report",
      summaryHtml,
      sectionsHtml
    });
  }
}

module.exports = {
  HtmlReportBuilder,
  escapeHtml,
  normalizeToken,
  resolveSeverityVariant,
  renderBadge,
  renderBadgeList,
  renderFileLinks,
  renderIssuesTable,
  buildHtmlPage
};
