const state = {
  documents: [],
  issues: [],
  report: null
};

const elements = {
  connectionStatus: document.getElementById("connectionStatus"),
  lastUpdated: document.getElementById("lastUpdated"),
  documentCount: document.getElementById("documentCount"),
  issueCount: document.getElementById("issueCount"),
  ruleCount: document.getElementById("ruleCount"),
  teamCount: document.getElementById("teamCount"),
  fileCount: document.getElementById("fileCount"),
  ruleTable: document.getElementById("ruleTable"),
  fileTable: document.getElementById("fileTable"),
  issueFeed: document.getElementById("issueFeed")
};

const formatTime = () => new Date().toLocaleTimeString();

const updateTimestamp = () => {
  elements.lastUpdated.textContent = formatTime();
};

const setConnectionStatus = (isConnected) => {
  elements.connectionStatus.textContent = isConnected ? "Live connection" : "Connecting…";
  elements.connectionStatus.classList.toggle("connected", isConnected);
};

const renderSummary = () => {
  const report = state.report;
  elements.documentCount.textContent = report ? report.summary.documents : 0;
  elements.issueCount.textContent = report ? report.summary.issues : 0;
  elements.ruleCount.textContent = report ? report.byRule.length : 0;
  elements.teamCount.textContent = report ? report.byTeam.length : 0;
  elements.fileCount.textContent = report ? report.summary.files : 0;
};

const formatCounts = (items, label) => {
  if (!items.length) {
    return "—";
  }
  return items.map((entry) => `${entry[label]} (${entry.count})`).join(", ");
};

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

const renderBadge = ({ label, count, variant = "rule" }) => {
  const safeLabel = label?.toString().trim() || "Unknown";
  const countHtml = Number.isFinite(count) ? `<span class="badge-count">${count}</span>` : "";
  return `
    <span class="badge badge--${variant}">
      <span>${safeLabel}</span>
      ${countHtml}
    </span>
  `;
};

const renderBadgeGroup = (items, labelKey, { countKey = "count", variant = "rule", variantResolver } = {}) => {
  if (!Array.isArray(items) || !items.length) {
    return `<span class="muted">—</span>`;
  }

  return `
    <div class="badge-group">
      ${items
        .map((entry) => {
          const resolvedVariant = variantResolver
            ? variantResolver(entry[labelKey])
            : variant;
          return renderBadge({
            label: entry[labelKey],
            count: entry[countKey],
            variant: resolvedVariant
          });
        })
        .join("")}
    </div>
  `;
};

const buildDownloadName = (filePath, extension = "json") => {
  const safe = String(filePath)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const normalizedExtension = extension === "html" ? "html" : "json";
  return safe ? `report-${safe}.${normalizedExtension}` : `report.${normalizedExtension}`;
};

const renderRules = () => {
  if (!state.report) {
    elements.ruleTable.innerHTML = "";
    return;
  }

  elements.ruleTable.innerHTML = state.report.byRule
    .map((rule) => {
      const files = rule.files.length ? rule.files.join(", ") : "—";
      const severityVariant = resolveSeverityVariant(rule.severity || "");
      const teamBadge = renderBadge({ label: rule.teamName || "Unassigned", variant: "team" });
      const severityBadge = renderBadge({
        label: rule.severity || "n/a",
        variant: severityVariant
      });
      const countBadge = renderBadge({ label: "Issues", count: rule.count, variant: "count" });
      return `
        <tr>
          <td><strong>${rule.ruleId}</strong><br /><span class="muted">${rule.description}</span></td>
          <td>${teamBadge}</td>
          <td>${severityBadge}</td>
          <td>${countBadge}</td>
          <td>${files}</td>
        </tr>
      `;
    })
    .join("");
};

const renderFiles = () => {
  if (!state.report) {
    elements.fileTable.innerHTML = "";
    return;
  }

  elements.fileTable.innerHTML = state.report.byFile
    .map((file) => {
      const topRules = file.rules.length
        ? renderBadgeGroup(file.rules.slice(0, 3), "ruleId", { variant: "rule" })
        : null;
      const severities = renderBadgeGroup(file.severities ?? [], "severity", {
        variantResolver: resolveSeverityVariant
      });
      const stylesheetIssues = renderBadgeGroup(file.linkedStylesheetsWithIssues ?? [], "filePath", { variant: "file" });
      const teams = renderBadgeGroup(file.teams ?? [], "teamName", { variant: "team" });
      const downloadUrl = `/report/file?path=${encodeURIComponent(file.filePath)}`;
      const downloadHtmlUrl = `/report/file?path=${encodeURIComponent(file.filePath)}&format=html`;
      const downloadName = buildDownloadName(file.filePath);
      const downloadHtmlName = buildDownloadName(file.filePath, "html");
      return `
        <tr>
          <td>${file.filePath}</td>
          <td>${file.issueCount}</td>
          <td>${topRules || "—"}</td>
          <td>${severities}</td>
          <td>${teams}</td>
          <td>${stylesheetIssues}</td>
          <td>
            <a class="pill-button" href="${downloadUrl}" download="${downloadName}">Save JSON</a>
            <a class="pill-button pill-button--secondary" href="${downloadHtmlUrl}" download="${downloadHtmlName}">Save HTML</a>
          </td>
        </tr>
      `;
    })
    .join("");
};

const renderIssues = () => {
  const issues = state.issues.slice(-8).reverse();
  elements.issueFeed.innerHTML = issues
    .map((issue) => {
      const severityVariant = resolveSeverityVariant(issue.severity || "");
      const issueClass = `issue-item issue-item--${severityVariant}`;
      const ruleBadge = renderBadge({ label: issue.ruleId, variant: "rule" });
      const severityBadge = renderBadge({ label: issue.severity || "n/a", variant: severityVariant });
      const teamBadge = renderBadge({ label: issue.teamName || "Unassigned", variant: "team" });
      return `
      <div class="${issueClass}">
        <div class="issue-title">
          ${issue.message}
          ${ruleBadge}
        </div>
        <div class="issue-meta">
          ${issue.filePath} • line ${issue.line ?? "?"}
        </div>
        <div class="issue-meta">
          ${severityBadge} ${teamBadge}
        </div>
      </div>
    `;
    })
    .join("");
};

const renderAll = () => {
  renderSummary();
  renderRules();
  renderFiles();
  renderIssues();
  updateTimestamp();
};

const loadInitialData = async () => {
  const [documents, issues, report] = await Promise.all([
    fetch("/documents").then((response) => response.json()),
    fetch("/issues").then((response) => response.json()),
    fetch("/report").then((response) => response.json())
  ]);

  state.documents = documents.documents ?? [];
  state.issues = issues.issues ?? [];
  state.report = report;
  renderAll();
};

const connectStream = () => {
  const stream = new EventSource("/events");

  stream.addEventListener("connected", () => {
    setConnectionStatus(true);
  });

  stream.addEventListener("capture", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.document) {
      state.documents.push(payload.document);
    }
    if (Array.isArray(payload.issues)) {
      state.issues.push(...payload.issues);
    }
    if (payload.report) {
      state.report = payload.report;
    }
    renderAll();
  });

  stream.addEventListener("error", () => {
    setConnectionStatus(false);
  });
};

const bootstrap = () => {
  loadInitialData()
    .then(() => {
      connectStream();
    })
    .catch(() => {
      setConnectionStatus(false);
    });
};

const shouldAutoBootstrap = typeof module === "undefined"
  || (typeof window !== "undefined" && window.__ADA_SCANNER_FORCE_BOOTSTRAP__ === true);

if (shouldAutoBootstrap) {
  bootstrap();
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    state,
    elements,
    formatTime,
    updateTimestamp,
    setConnectionStatus,
    renderSummary,
    renderRules,
    renderFiles,
    renderIssues,
    renderAll,
    formatCounts,
    normalizeToken,
    resolveSeverityVariant,
    renderBadge,
    renderBadgeGroup,
    buildDownloadName,
    loadInitialData,
    connectStream,
    bootstrap
  };
}
