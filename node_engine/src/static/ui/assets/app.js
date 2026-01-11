const state = {
  documents: [],
  issues: [],
  report: null,
  filters: {
    fileQuery: "",
    issueQuery: "",
    domainQuery: "",
    ruleId: "all",
    severity: "all"
  }
};

const elements = {
  connectionStatus: document.getElementById("connectionStatus"),
  lastUpdated: document.getElementById("lastUpdated"),
  documentCount: document.getElementById("documentCount"),
  fileCount: document.getElementById("fileCount"),
  issueCount: document.getElementById("issueCount"),
  ruleCount: document.getElementById("ruleCount"),
  coveragePercent: document.getElementById("coveragePercent"),
  missingRuleCount: document.getElementById("missingRuleCount"),
  fileSearchInput: document.getElementById("fileSearchInput"),
  domainSearchInput: document.getElementById("domainSearchInput"),
  issueSearchInput: document.getElementById("issueSearchInput"),
  ruleFilterSelect: document.getElementById("ruleFilterSelect"),
  severityFilterSelect: document.getElementById("severityFilterSelect"),
  clearFiltersButton: document.getElementById("clearFilters"),
  fileResultCount: document.getElementById("fileResultCount"),
  issueResultCount: document.getElementById("issueResultCount"),
  missingRuleResultCount: document.getElementById("missingRuleResultCount"),
  fileTable: document.getElementById("fileTable"),
  issueFeed: document.getElementById("issueFeed"),
  missingRuleList: document.getElementById("missingRuleList"),
  tabShell: document.querySelector("[data-tab-shell]"),
  tabButtons: Array.from(document.querySelectorAll("[data-tab-target]")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]"))
};

const formatTime = () => new Date().toLocaleTimeString();

const normalizeText = (value) => String(value ?? "").toLowerCase();

const matchesQuery = (value, query) => {
  if (!query) {
    return true;
  }
  return normalizeText(value).includes(normalizeText(query));
};

const extractDomain = (value) => {
  const text = String(value ?? "").trim();
  if (!text || !/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    return "";
  }
  try {
    return new URL(text).hostname;
  } catch (error) {
    return "";
  }
};

const matchesWildcard = (value, query) => {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) {
    return true;
  }
  if (normalizedQuery === "*") {
    return true;
  }
  if (!value) {
    return false;
  }
  const escaped = normalizedQuery.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(String(value).toLowerCase());
};

const matchesDomainQuery = (value, query) => matchesWildcard(extractDomain(value), query);

const updateTimestamp = () => {
  elements.lastUpdated.textContent = formatTime();
};

const setConnectionStatus = (isConnected) => {
  elements.connectionStatus.textContent = isConnected ? "Ready" : "Offline";
  elements.connectionStatus.classList.toggle("connected", isConnected);
};

const setActiveTab = (tabId) => {
  if (!elements.tabShell) {
    return;
  }
  const availableTabs = elements.tabButtons ?? [];
  const fallbackTab = elements.tabShell.dataset.activeTab
    || availableTabs[0]?.dataset.tabTarget
    || "home";
  const nextTab = tabId || fallbackTab;
  elements.tabShell.dataset.activeTab = nextTab;

  availableTabs.forEach((button) => {
    const isActive = button.dataset.tabTarget === nextTab;
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });

  (elements.tabPanels ?? []).forEach((panel) => {
    const panelTab = panel.dataset.tabPanel;
    const isShared = panelTab === "shared";
    const shouldShow = isShared || nextTab === "home" || panelTab === nextTab;
    panel.hidden = !shouldShow;
  });
};

const buildDownloadName = (filePath, extension = "json") => {
  const safe = String(filePath)
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  const normalizedExtension = extension === "html" ? "html" : "json";
  return safe ? `report-${safe}.${normalizedExtension}` : `report.${normalizedExtension}`;
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

const matchesSeverity = (severityValue, activeSeverity) => {
  if (!activeSeverity || activeSeverity === "all") {
    return true;
  }
  return normalizeToken(severityValue) === activeSeverity;
};

const renderBadge = (label, severity) => {
  const variant = resolveSeverityVariant(severity);
  return `<span class="badge badge--${variant}">${label}</span>`;
};

const formatCounts = (items, label) => {
  if (!items.length) {
    return "—";
  }
  return items.map((entry) => `${entry[label]} (${entry.count})`).join(", ");
};

const getRuleOptions = () => {
  if (!state.report || !Array.isArray(state.report.byRule)) {
    return [];
  }
  return state.report.byRule
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((rule) => ({
      id: rule.ruleId,
      label: `${rule.ruleId} (${rule.count})`
    }));
};

const syncFiltersFromInputs = () => {
  state.filters = {
    fileQuery: elements.fileSearchInput?.value?.trim() ?? "",
    issueQuery: elements.issueSearchInput?.value?.trim() ?? "",
    domainQuery: elements.domainSearchInput?.value?.trim() ?? "",
    ruleId: elements.ruleFilterSelect?.value || "all",
    severity: elements.severityFilterSelect?.value || "all"
  };
};

const resetFilters = () => {
  if (elements.fileSearchInput) {
    elements.fileSearchInput.value = "";
  }
  if (elements.domainSearchInput) {
    elements.domainSearchInput.value = "";
  }
  if (elements.issueSearchInput) {
    elements.issueSearchInput.value = "";
  }
  if (elements.ruleFilterSelect) {
    elements.ruleFilterSelect.value = "all";
  }
  if (elements.severityFilterSelect) {
    elements.severityFilterSelect.value = "all";
  }
  syncFiltersFromInputs();
  renderAll();
};

const matchesRule = (ruleId, candidateRules) => {
  if (!ruleId || ruleId === "all") {
    return true;
  }
  return (candidateRules ?? []).some((rule) => rule.ruleId === ruleId || rule.id === ruleId);
};

const getFilteredFiles = () => {
  if (!state.report || !Array.isArray(state.report.byFile)) {
    return [];
  }
  const { fileQuery, domainQuery, ruleId, severity } = state.filters;
  return state.report.byFile.filter((file) =>
    matchesQuery(file.filePath, fileQuery)
    && matchesDomainQuery(file.filePath, domainQuery)
    && matchesRule(ruleId, file.rules)
    && (severity === "all"
      ? true
      : (file.severities ?? []).some((entry) => matchesSeverity(entry.severity, severity)))
  );
};

const buildIssueSearchTarget = (issue) => [
  issue.message,
  issue.ruleId,
  issue.filePath,
  issue.teamName
].filter(Boolean).join(" ");

const getFilteredIssues = () => {
  const { issueQuery, domainQuery, ruleId, severity } = state.filters;
  const activeRule = ruleId || "all";
  return state.issues.filter((issue) =>
    matchesQuery(buildIssueSearchTarget(issue), issueQuery)
    && matchesDomainQuery(issue.filePath, domainQuery)
    && (activeRule === "all" || issue.ruleId === activeRule)
    && matchesSeverity(issue.severity ?? "unknown", severity)
  );
};

const renderSummary = () => {
  const report = state.report;
  if (elements.documentCount) {
    elements.documentCount.textContent = state.documents.length;
  }
  elements.fileCount.textContent = report ? report.summary.files : 0;
  elements.issueCount.textContent = report ? report.summary.issues : 0;
  elements.ruleCount.textContent = report ? report.byRule.length : 0;
  const coverage = report?.coverage ?? report?.summary?.coverage ?? null;
  if (elements.coveragePercent) {
    elements.coveragePercent.textContent = coverage
      ? `${coverage.coveragePercent ?? 0}%`
      : "0%";
  }
  if (elements.missingRuleCount) {
    elements.missingRuleCount.textContent = coverage?.missingRuleCount ?? 0;
  }
};

const renderFilters = () => {
  if (!elements.ruleFilterSelect) {
    return;
  }

  const options = getRuleOptions();
  const currentValue = elements.ruleFilterSelect.value || "all";
  elements.ruleFilterSelect.innerHTML = [
    '<option value="all">All rules</option>',
    ...options.map((rule) => `<option value="${rule.id}">${rule.label}</option>`)
  ].join("");
  if (options.some((rule) => rule.id === currentValue)) {
    elements.ruleFilterSelect.value = currentValue;
  }
};

const renderFiles = () => {
  if (!state.report) {
    elements.fileTable.innerHTML = "";
    return;
  }

  const filteredFiles = getFilteredFiles();
  if (elements.fileResultCount) {
    elements.fileResultCount.textContent = `${filteredFiles.length} of ${state.report.byFile.length}`;
  }

  if (!filteredFiles.length) {
    elements.fileTable.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No files match the current filters.</td>
      </tr>
    `;
    return;
  }

  elements.fileTable.innerHTML = filteredFiles
    .map((file) => {
    const topRules = file.rules.slice(0, 3).map((rule) => `${rule.ruleId} (${rule.count})`).join(", ");
    const stylesheetIssues = formatCounts(file.linkedStylesheetsWithIssues ?? [], "filePath");
    const severitySummary = formatCounts(file.severities ?? [], "severity");
    const downloadUrl = `/report/file?path=${encodeURIComponent(file.filePath)}`;
    const downloadHtmlUrl = `/report/file?path=${encodeURIComponent(file.filePath)}&format=html`;
    const viewUrl = `/report/file?path=${encodeURIComponent(file.filePath)}&format=html&inline=1`;
    const downloadName = buildDownloadName(file.filePath);
    const downloadHtmlName = buildDownloadName(file.filePath, "html");
    return `
      <tr>
        <td>${file.filePath}</td>
        <td>${file.issueCount}</td>
        <td>${topRules || "—"}</td>
        <td>${stylesheetIssues}</td>
        <td>${severitySummary}</td>
        <td>
          <div class="table-actions">
            <a class="pill-button pill-button--secondary" href="${viewUrl}" target="_blank" rel="noopener">View</a>
            <a class="pill-button" href="${downloadUrl}" download="${downloadName}">Download JSON</a>
            <a class="pill-button pill-button--secondary" href="${downloadHtmlUrl}" download="${downloadHtmlName}">
              Download HTML
            </a>
          </div>
        </td>
      </tr>
      `;
    })
    .join("");
};

const renderIssues = () => {
  const filteredIssues = getFilteredIssues();
  if (elements.issueResultCount) {
    elements.issueResultCount.textContent = `${filteredIssues.length} of ${state.issues.length}`;
  }
  const issues = filteredIssues.slice(-8).reverse();
  if (!issues.length) {
    const message = state.issues.length
      ? "No issues match the current filters."
      : "No issues detected yet.";
    elements.issueFeed.innerHTML = `<p class="muted">${message}</p>`;
    return;
  }

  elements.issueFeed.innerHTML = issues
    .map((issue) => `
      <div class="issue-item issue-item--${resolveSeverityVariant(issue.severity)}">
        <div class="issue-title">
          ${issue.message}
          ${renderBadge(issue.ruleId, issue.severity)}
        </div>
        <div class="issue-meta">
          ${issue.filePath} • line ${issue.line ?? "?"} • ${issue.teamName || "Unassigned"}
          ${renderBadge(issue.severity || "unknown", issue.severity)}
        </div>
      </div>
    `)
    .join("");
};

const renderMissingRules = () => {
  const missingRules = state.report?.coverage?.missingRules ?? [];
  if (elements.missingRuleResultCount) {
    elements.missingRuleResultCount.textContent = String(missingRules.length);
  }
  if (!elements.missingRuleList) {
    return;
  }
  if (!missingRules.length) {
    elements.missingRuleList.innerHTML = `<p class="muted">All configured rules triggered at least once.</p>`;
    return;
  }

  elements.missingRuleList.innerHTML = missingRules
    .map((rule) => `
      <div class="issue-item issue-item--severity-unknown">
        <div class="issue-title">
          ${rule.ruleId} ${renderBadge(rule.severity || "unknown", rule.severity)}
        </div>
        <div class="issue-meta">
          ${rule.teamName || "Unassigned"} • ${rule.checkId || "unknown"}${rule.description ? ` • ${rule.description}` : ""}
        </div>
      </div>
    `)
    .join("");
};

const renderAll = () => {
  syncFiltersFromInputs();
  renderSummary();
  renderFilters();
  renderFiles();
  renderIssues();
  renderMissingRules();
  updateTimestamp();
};

const bindEvents = () => {
  if (bindEvents.bound) {
    return;
  }
  bindEvents.bound = true;
  elements.fileSearchInput?.addEventListener("input", renderAll);
  elements.domainSearchInput?.addEventListener("input", renderAll);
  elements.issueSearchInput?.addEventListener("input", renderAll);
  elements.ruleFilterSelect?.addEventListener("change", renderAll);
  elements.severityFilterSelect?.addEventListener("change", renderAll);
  elements.clearFiltersButton?.addEventListener("click", resetFilters);
  (elements.tabButtons ?? []).forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  });
  setActiveTab(elements.tabShell?.dataset.activeTab);
};

bindEvents.bound = false;

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
  bindEvents();
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

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    state,
    elements,
    formatTime,
    updateTimestamp,
    setConnectionStatus,
    normalizeText,
    matchesQuery,
    extractDomain,
    matchesWildcard,
    matchesDomainQuery,
    renderSummary,
    renderFilters,
    renderFiles,
    renderIssues,
    renderAll,
    buildDownloadName,
    normalizeToken,
    resolveSeverityVariant,
    matchesSeverity,
    renderBadge,
    getRuleOptions,
    syncFiltersFromInputs,
    resetFilters,
    matchesRule,
    getFilteredFiles,
    buildIssueSearchTarget,
    getFilteredIssues,
    renderMissingRules,
    bindEvents,
    setActiveTab,
    loadInitialData,
    bootstrap
  };
}
