const state = {
  documents: [],
  issues: [],
  report: null,
  filters: {
    ruleQuery: "",
    fileQuery: "",
    domainQuery: "",
    severity: "all"
  }
};

const elements = {
  connectionStatus: document.getElementById("connectionStatus"),
  lastUpdated: document.getElementById("lastUpdated"),
  documentCount: document.getElementById("documentCount"),
  issueCount: document.getElementById("issueCount"),
  ruleCount: document.getElementById("ruleCount"),
  teamCount: document.getElementById("teamCount"),
  fileCount: document.getElementById("fileCount"),
  checkCount: document.getElementById("checkCount"),
  ruleSearchInput: document.getElementById("ruleSearchInput"),
  fileSearchInput: document.getElementById("fileSearchInput"),
  domainSearchInput: document.getElementById("domainSearchInput"),
  severityFilterSelect: document.getElementById("severityFilterSelect"),
  clearFiltersButton: document.getElementById("clearFilters"),
  ruleResultCount: document.getElementById("ruleResultCount"),
  fileResultCount: document.getElementById("fileResultCount"),
  issueResultCount: document.getElementById("issueResultCount"),
  ruleTable: document.getElementById("ruleTable"),
  fileTable: document.getElementById("fileTable"),
  issueFeed: document.getElementById("issueFeed"),
  severityBreakdown: document.getElementById("severityBreakdown"),
  checkBreakdown: document.getElementById("checkBreakdown"),
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
  elements.connectionStatus.textContent = isConnected ? "Live connection" : "Connecting…";
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

const renderSummary = () => {
  const report = state.report;
  elements.documentCount.textContent = report ? report.summary.documents : 0;
  elements.issueCount.textContent = report ? report.summary.issues : 0;
  elements.ruleCount.textContent = report ? report.summary.rules ?? report.byRule.length : 0;
  elements.teamCount.textContent = report ? report.summary.teams ?? report.byTeam.length : 0;
  elements.fileCount.textContent = report ? report.summary.files : 0;
  elements.checkCount.textContent = report ? report.summary.checks ?? report.byCheck?.length ?? 0 : 0;
};

const syncFiltersFromInputs = () => {
  state.filters = {
    ruleQuery: elements.ruleSearchInput?.value?.trim() ?? "",
    fileQuery: elements.fileSearchInput?.value?.trim() ?? "",
    domainQuery: elements.domainSearchInput?.value?.trim() ?? "",
    severity: elements.severityFilterSelect?.value || "all"
  };
};

const resetFilters = () => {
  if (elements.ruleSearchInput) {
    elements.ruleSearchInput.value = "";
  }
  if (elements.fileSearchInput) {
    elements.fileSearchInput.value = "";
  }
  if (elements.domainSearchInput) {
    elements.domainSearchInput.value = "";
  }
  if (elements.severityFilterSelect) {
    elements.severityFilterSelect.value = "all";
  }
  syncFiltersFromInputs();
  renderAll();
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

const matchesSeverity = (severityValue, activeSeverity) => {
  if (!activeSeverity || activeSeverity === "all") {
    return true;
  }
  const normalized = normalizeToken(severityValue);
  return normalized === activeSeverity;
};

const buildRuleSearchTarget = (rule) => [
  rule.ruleId,
  rule.description,
  rule.teamName,
  rule.severity
].filter(Boolean).join(" ");

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

  const { ruleQuery, domainQuery, severity } = state.filters;
  const filteredRules = state.report.byRule.filter(
    (rule) =>
      matchesQuery(buildRuleSearchTarget(rule), ruleQuery)
      && (!domainQuery
        ? true
        : (rule.files ?? []).some((filePath) => matchesDomainQuery(filePath, domainQuery)))
      && matchesSeverity(rule.severity || "unknown", severity)
  );

  if (elements.ruleResultCount) {
    elements.ruleResultCount.textContent = `${filteredRules.length} of ${state.report.byRule.length}`;
  }

  if (!filteredRules.length) {
    elements.ruleTable.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No rules match the current filters.</td>
      </tr>
    `;
    return;
  }

  elements.ruleTable.innerHTML = filteredRules
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

  const { fileQuery, domainQuery, severity } = state.filters;
  const filteredFiles = state.report.byFile.filter((file) => {
    const matchesFile = matchesQuery(file.filePath, fileQuery);
    const matchesDomain = matchesDomainQuery(file.filePath, domainQuery);
    const matchesFileSeverity = !severity || severity === "all"
      ? true
      : (file.severities ?? []).some((entry) => matchesSeverity(entry.severity, severity));
    return matchesFile && matchesDomain && matchesFileSeverity;
  });

  if (elements.fileResultCount) {
    elements.fileResultCount.textContent = `${filteredFiles.length} of ${state.report.byFile.length}`;
  }

  if (!filteredFiles.length) {
    elements.fileTable.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No files match the current filters.</td>
      </tr>
    `;
    return;
  }

  elements.fileTable.innerHTML = filteredFiles
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
  const { ruleQuery, fileQuery, domainQuery, severity } = state.filters;
  const filteredIssues = state.issues.filter((issue) => {
    const matchesRuleQuery = matchesQuery(
      [issue.ruleId, issue.message].filter(Boolean).join(" "),
      ruleQuery
    );
    const matchesFileQuery = matchesQuery(issue.filePath, fileQuery);
    const matchesDomain = matchesDomainQuery(issue.filePath, domainQuery);
    const matchesIssueSeverity = matchesSeverity(issue.severity || "unknown", severity);
    return matchesRuleQuery && matchesFileQuery && matchesDomain && matchesIssueSeverity;
  });

  if (elements.issueResultCount) {
    elements.issueResultCount.textContent = `${filteredIssues.length} of ${state.issues.length}`;
  }

  const issues = filteredIssues.slice(-8).reverse();
  if (!issues.length) {
    const message = state.issues.length
      ? "No issues match the current filters."
      : "No issues detected yet.";
    elements.issueFeed.innerHTML = `<p class="muted empty-state">${message}</p>`;
    return;
  }
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

const renderBreakdowns = () => {
  if (!state.report) {
    elements.severityBreakdown.innerHTML = "—";
    elements.checkBreakdown.innerHTML = "—";
    return;
  }

  elements.severityBreakdown.innerHTML = renderBadgeGroup(
    state.report.bySeverity ?? [],
    "severity",
    { variantResolver: resolveSeverityVariant }
  );
  elements.checkBreakdown.innerHTML = renderBadgeGroup(
    state.report.byCheck ?? [],
    "checkId",
    { variant: "rule" }
  );
};

const renderAll = () => {
  syncFiltersFromInputs();
  renderSummary();
  renderRules();
  renderFiles();
  renderIssues();
  renderBreakdowns();
  updateTimestamp();
};

const bindEvents = () => {
  if (bindEvents.bound) {
    return;
  }
  bindEvents.bound = true;
  elements.ruleSearchInput?.addEventListener("input", renderAll);
  elements.fileSearchInput?.addEventListener("input", renderAll);
  elements.domainSearchInput?.addEventListener("input", renderAll);
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
  bindEvents();
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
    renderBreakdowns,
    renderAll,
    formatCounts,
    normalizeText,
    matchesQuery,
    extractDomain,
    matchesWildcard,
    matchesDomainQuery,
    normalizeToken,
    resolveSeverityVariant,
    matchesSeverity,
    buildRuleSearchTarget,
    renderBadge,
    renderBadgeGroup,
    buildDownloadName,
    syncFiltersFromInputs,
    resetFilters,
    bindEvents,
    setActiveTab,
    loadInitialData,
    connectStream,
    bootstrap
  };
}
