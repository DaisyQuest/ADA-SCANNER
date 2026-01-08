const state = {
  documents: [],
  issues: [],
  report: null
};

const elements = {
  connectionStatus: document.getElementById("connectionStatus"),
  lastUpdated: document.getElementById("lastUpdated"),
  fileCount: document.getElementById("fileCount"),
  issueCount: document.getElementById("issueCount"),
  ruleCount: document.getElementById("ruleCount"),
  fileTable: document.getElementById("fileTable"),
  issueFeed: document.getElementById("issueFeed")
};

const formatTime = () => new Date().toLocaleTimeString();

const updateTimestamp = () => {
  elements.lastUpdated.textContent = formatTime();
};

const setConnectionStatus = (isConnected) => {
  elements.connectionStatus.textContent = isConnected ? "Ready" : "Offline";
  elements.connectionStatus.classList.toggle("connected", isConnected);
};

const buildDownloadName = (filePath, extension = "json") => {
  const safe = String(filePath)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const normalizedExtension = extension === "html" ? "html" : "json";
  return safe ? `report-${safe}.${normalizedExtension}` : `report.${normalizedExtension}`;
};

const renderSummary = () => {
  const report = state.report;
  elements.fileCount.textContent = report ? report.summary.files : 0;
  elements.issueCount.textContent = report ? report.summary.issues : 0;
  elements.ruleCount.textContent = report ? report.byRule.length : 0;
};

const renderFiles = () => {
  if (!state.report) {
    elements.fileTable.innerHTML = "";
    return;
  }

  elements.fileTable.innerHTML = state.report.byFile
    .map((file) => {
      const topRules = file.rules.slice(0, 3).map((rule) => `${rule.ruleId} (${rule.count})`).join(", ");
      const downloadUrl = `/report/file?path=${encodeURIComponent(file.filePath)}`;
      const downloadHtmlUrl = `/report/file?path=${encodeURIComponent(file.filePath)}&format=html`;
      const downloadName = buildDownloadName(file.filePath);
      const downloadHtmlName = buildDownloadName(file.filePath, "html");
      return `
        <tr>
          <td>${file.filePath}</td>
          <td>${file.issueCount}</td>
          <td>${topRules || "—"}</td>
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
  if (!issues.length) {
    elements.issueFeed.innerHTML = "<p class=\"muted\">No issues detected yet.</p>";
    return;
  }

  elements.issueFeed.innerHTML = issues
    .map((issue) => `
      <div class="issue-item">
        <div class="issue-title">
          ${issue.message}
          <span class="badge">${issue.ruleId}</span>
        </div>
        <div class="issue-meta">
          ${issue.filePath} • line ${issue.line ?? "?"} • ${issue.teamName || "Unassigned"}
        </div>
      </div>
    `)
    .join("");
};

const renderAll = () => {
  renderSummary();
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

const bootstrap = () => {
  loadInitialData()
    .then(() => {
      setConnectionStatus(true);
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

if (typeof module !== "undefined") {
  module.exports = {
    state,
    elements,
    formatTime,
    updateTimestamp,
    setConnectionStatus,
    renderSummary,
    renderFiles,
    renderIssues,
    renderAll,
    buildDownloadName,
    loadInitialData,
    bootstrap
  };
}
