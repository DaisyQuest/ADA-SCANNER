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
};

const renderRules = () => {
  if (!state.report) {
    elements.ruleTable.innerHTML = "";
    return;
  }

  elements.ruleTable.innerHTML = state.report.byRule
    .map((rule) => {
      const files = rule.files.length ? rule.files.join(", ") : "—";
      return `
        <tr>
          <td><strong>${rule.ruleId}</strong><br /><span class="muted">${rule.description}</span></td>
          <td>${rule.teamName || "Unassigned"}</td>
          <td>${rule.severity || "n/a"}</td>
          <td>${rule.count}</td>
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
      const topRules = file.rules.slice(0, 3).map((rule) => `${rule.ruleId} (${rule.count})`).join(", ");
      return `
        <tr>
          <td>${file.filePath}</td>
          <td>${file.issueCount}</td>
          <td>${topRules || "—"}</td>
        </tr>
      `;
    })
    .join("");
};

const renderIssues = () => {
  const issues = state.issues.slice(-8).reverse();
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

loadInitialData()
  .then(() => {
    connectStream();
  })
  .catch(() => {
    setConnectionStatus(false);
  });
