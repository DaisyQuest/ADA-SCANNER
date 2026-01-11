/** @jest-environment jsdom */

const setupDom = () => {
  document.body.innerHTML = `
    <div data-tab-shell data-active-tab="home">
      <button data-tab-target="home" aria-selected="true"></button>
      <button data-tab-target="rules" aria-selected="false"></button>
      <button data-tab-target="files" aria-selected="false"></button>
      <button data-tab-target="severity" aria-selected="false"></button>
      <button data-tab-target="checks" aria-selected="false"></button>
      <button data-tab-target="issues" aria-selected="false"></button>
      <section data-tab-panel="shared"></section>
      <section data-tab-panel="rules"></section>
      <section data-tab-panel="files"></section>
      <section data-tab-panel="severity"></section>
      <section data-tab-panel="checks"></section>
      <section data-tab-panel="issues"></section>
      <section data-tab-panel="home"></section>
    </div>
    <div id="connectionStatus"></div>
    <span id="lastUpdated"></span>
    <div id="documentCount"></div>
    <div id="issueCount"></div>
    <div id="ruleCount"></div>
    <div id="teamCount"></div>
    <div id="fileCount"></div>
    <div id="checkCount"></div>
    <input id="ruleSearchInput" />
    <input id="fileSearchInput" />
    <input id="domainSearchInput" />
    <select id="severityFilterSelect">
      <option value="all">All severities</option>
      <option value="high">High</option>
    </select>
    <button id="clearFilters"></button>
    <div id="ruleResultCount"></div>
    <div id="fileResultCount"></div>
    <div id="issueResultCount"></div>
    <table><tbody id="ruleTable"></tbody></table>
    <table><tbody id="fileTable"></tbody></table>
    <div id="issueFeed"></div>
    <div id="severityBreakdown"></div>
    <div id="checkBreakdown"></div>
  `;
};

const createResponse = (payload) => Promise.resolve({ json: () => Promise.resolve(payload) });

describe("Runtime listener UI app", () => {
  const originalFetch = global.fetch;
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    setupDom();
    jest.resetModules();
  });

  afterEach(() => {
    if (originalFetch === undefined) {
      delete global.fetch;
    } else {
      global.fetch = originalFetch;
    }

    if (originalEventSource === undefined) {
      delete global.EventSource;
    } else {
      global.EventSource = originalEventSource;
    }

    delete window.__ADA_SCANNER_FORCE_BOOTSTRAP__;
  });

  test("renders summary and tables", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 2, issues: 3, files: 1 },
      bySeverity: [
        { severity: "high", count: 2 },
        { severity: "low", count: 1 }
      ],
      byCheck: [
        { checkId: "check-a", count: 2 },
        { checkId: "check-b", count: 1 }
      ],
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 2,
          files: ["file-a"],
          checks: ["check-a"]
        },
        {
          ruleId: "rule-2",
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
          filePath: "file-a",
          issueCount: 3,
          rules: [{ ruleId: "rule-1", count: 3 }],
          teams: [{ teamName: "team-a", count: 3 }],
          severities: [{ severity: "high", count: 3 }],
          checks: [{ checkId: "check-a", count: 3 }],
          linkedStylesheetsWithIssues: [{ filePath: "styles.css", count: 2 }]
        },
        {
          filePath: "file-b",
          issueCount: 0,
          rules: [],
          teams: undefined,
          severities: undefined,
          checks: [],
          linkedStylesheetsWithIssues: undefined
        }
      ],
      byTeam: [{ teamName: "team-a", issueCount: 3, rules: [{ ruleId: "rule-1", count: 3 }] }]
    };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a", line: 1, teamName: "team-a", severity: "high" },
      { message: "Other", ruleId: "rule-2", filePath: "file-b", line: null, teamName: "" }
    ];

    app.renderAll();

    expect(app.elements.documentCount.textContent).toBe("2");
    expect(app.elements.issueCount.textContent).toBe("3");
    expect(app.elements.ruleCount.textContent).toBe("2");
    expect(app.elements.teamCount.textContent).toBe("1");
    expect(app.elements.fileCount.textContent).toBe("1");
    expect(app.elements.checkCount.textContent).toBe("2");
    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
    expect(app.elements.ruleTable.innerHTML).toContain("—");
    expect(app.elements.ruleTable.innerHTML).toContain("badge--team");
    expect(app.elements.ruleTable.innerHTML).toContain("badge--severity-high");
    expect(app.elements.ruleResultCount.textContent).toBe("2 of 2");
    expect(app.elements.fileTable.innerHTML).toContain("View");
    expect(app.elements.fileTable.innerHTML).toContain("Download JSON");
    expect(app.elements.fileTable.innerHTML).toContain("Download HTML");
    expect(app.elements.fileTable.innerHTML).toContain("report-file-b.json");
    expect(app.elements.fileTable.innerHTML).toContain("report-file-b.html");
    expect(app.elements.fileTable.innerHTML).toContain("inline=1");
    expect(app.elements.fileTable.innerHTML).toContain("styles.css");
    expect(app.elements.fileTable.innerHTML).toContain("badge--file");
    expect(app.elements.fileTable.innerHTML).toContain("badge--team");
    expect(app.elements.fileResultCount.textContent).toBe("2 of 2");
    expect(app.elements.issueFeed.innerHTML).toContain("Problem");
    expect(app.elements.issueFeed.innerHTML).toContain("line ?");
    expect(app.elements.issueFeed.innerHTML).toContain("badge--severity-high");
    expect(app.elements.issueFeed.innerHTML).toContain("badge--team");
    expect(app.elements.issueResultCount.textContent).toBe("2 of 2");
    expect(app.elements.severityBreakdown.innerHTML).toContain("badge--severity-high");
    expect(app.elements.checkBreakdown.innerHTML).toContain("check-a");
  });

  test("clears tables when report is missing", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = null;

    app.renderSummary();
    app.renderRules();
    app.renderFiles();
    app.renderBreakdowns();

    expect(app.elements.documentCount.textContent).toBe("0");
    expect(app.elements.issueCount.textContent).toBe("0");
    expect(app.elements.ruleTable.innerHTML).toBe("");
    expect(app.elements.fileTable.innerHTML).toBe("");
    expect(app.elements.severityBreakdown.innerHTML).toContain("—");
  });

  test("renderSummary prefers explicit summary values", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 5, issues: 4, files: 3, rules: 10, teams: 2, checks: 7 },
      byRule: [{ ruleId: "rule-1" }],
      byTeam: [{ teamName: "team-a" }],
      byCheck: [{ checkId: "check-a" }]
    };

    app.renderSummary();

    expect(app.elements.ruleCount.textContent).toBe("10");
    expect(app.elements.teamCount.textContent).toBe("2");
    expect(app.elements.checkCount.textContent).toBe("7");
  });

  test("renderSummary falls back when check summary data is missing", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byTeam: [],
      byCheck: undefined
    };

    app.renderSummary();

    expect(app.elements.checkCount.textContent).toBe("0");
  });

  test("renders empty states when no issues are available", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 0, issues: 0, files: 0 },
      byRule: [],
      byFile: [],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.issues = [];

    app.renderIssues();

    expect(app.elements.issueFeed.innerHTML).toContain("No issues detected yet.");
    expect(app.elements.issueResultCount.textContent).toBe("0 of 0");
  });

  test("renders filtered issue empty state when filters exclude issues", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byFile: [],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.issues = [
      { message: "Issue A", ruleId: "rule-1", filePath: "file-a", severity: "high" }
    ];

    app.elements.ruleSearchInput.value = "missing";
    app.renderAll();

    expect(app.elements.issueFeed.innerHTML).toContain("No issues match the current filters.");
    expect(app.elements.issueResultCount.textContent).toBe("0 of 1");
  });

  test("loads initial data and updates DOM", async () => {
    const app = require("../src/listener/ui/assets/app");
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({ documents: [{ url: "a" }] }))
      .mockReturnValueOnce(createResponse({ issues: [{ ruleId: "rule-1" }] }))
      .mockReturnValueOnce(createResponse({
        summary: { documents: 1, issues: 1, files: 1, rules: 0, teams: 0, checks: 0 },
        byRule: [],
        byFile: [],
        byTeam: [],
        bySeverity: [],
        byCheck: []
      }));

    await app.loadInitialData();

    expect(app.state.documents).toHaveLength(1);
    expect(app.state.issues).toHaveLength(1);
    expect(app.state.report.summary.issues).toBe(1);
    expect(app.elements.documentCount.textContent).toBe("1");
  });

  test("loadInitialData defaults missing arrays", async () => {
    const app = require("../src/listener/ui/assets/app");
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({}))
      .mockReturnValueOnce(createResponse({}))
      .mockReturnValueOnce(createResponse({
        summary: { documents: 0, issues: 0, files: 0, rules: 0, teams: 0, checks: 0 },
        byRule: [],
        byFile: [],
        byTeam: [],
        bySeverity: [],
        byCheck: []
      }));

    await app.loadInitialData();

    expect(app.state.documents).toEqual([]);
    expect(app.state.issues).toEqual([]);
  });

  test("connectStream updates state on events", () => {
    const app = require("../src/listener/ui/assets/app");
    const listeners = {};
    global.EventSource = class {
      constructor() {
        this.addEventListener = (name, handler) => {
          listeners[name] = handler;
        };
      }
    };

    app.connectStream();
    listeners.connected();
    expect(app.elements.connectionStatus.textContent).toBe("Live connection");

    listeners.capture({
      data: JSON.stringify({
        document: { url: "file-a" },
        issues: [{ ruleId: "rule-1" }],
        report: {
          summary: { documents: 1, issues: 1, files: 1, rules: 0, teams: 0, checks: 0 },
          byRule: [],
          byFile: [],
          byTeam: [],
          bySeverity: [],
          byCheck: []
        }
      })
    });
    expect(app.state.documents).toHaveLength(1);
    expect(app.state.issues).toHaveLength(1);
    expect(app.state.report.summary.issues).toBe(1);

    listeners.capture({
      data: JSON.stringify({})
    });

    listeners.error();
    expect(app.elements.connectionStatus.textContent).toBe("Connecting…");
  });

  test("bootstrap handles load errors", async () => {
    jest.resetModules();
    setupDom();
    window.__ADA_SCANNER_FORCE_BOOTSTRAP__ = true;
    global.fetch = jest.fn().mockRejectedValue(new Error("nope"));
    const app = require("../src/listener/ui/assets/app");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(app.elements.connectionStatus.textContent).toBe("Connecting…");
    delete window.__ADA_SCANNER_FORCE_BOOTSTRAP__;
  });

  test("bootstrap connects on successful load", async () => {
    jest.resetModules();
    setupDom();
    window.__ADA_SCANNER_FORCE_BOOTSTRAP__ = true;
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({ documents: [] }))
      .mockReturnValueOnce(createResponse({ issues: [] }))
      .mockReturnValueOnce(createResponse({
        summary: { documents: 0, issues: 0, files: 0, rules: 0, teams: 0, checks: 0 },
        byRule: [],
        byFile: [],
        byTeam: [],
        bySeverity: [],
        byCheck: []
      }));
    const eventSourceSpy = jest.fn();
    global.EventSource = class {
      constructor() {
        eventSourceSpy();
        this.addEventListener = jest.fn();
      }
    };

    require("../src/listener/ui/assets/app");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(eventSourceSpy).toHaveBeenCalled();
    delete window.__ADA_SCANNER_FORCE_BOOTSTRAP__;
  });

  test("buildDownloadName falls back for invalid input", () => {
    const app = require("../src/listener/ui/assets/app");
    expect(app.buildDownloadName("###")).toBe("report.json");
    expect(app.buildDownloadName("###", "html")).toBe("report.html");
    expect(app.buildDownloadName("file-a", "html")).toBe("report-file-a.html");
  });

  test("renders badge helpers with variants and empty states", () => {
    const app = require("../src/listener/ui/assets/app");
    expect(app.normalizeText(null)).toBe("");
    expect(app.normalizeToken("High Priority")).toBe("high-priority");
    expect(app.normalizeToken(null)).toBe("unknown");
    expect(app.resolveSeverityVariant("High")).toBe("severity-high");
    expect(app.resolveSeverityVariant("Medium")).toBe("severity-medium");
    expect(app.resolveSeverityVariant("Low")).toBe("severity-low");
    expect(app.resolveSeverityVariant("")).toBe("severity-unknown");
    expect(app.matchesSeverity("high", "high")).toBe(true);
    expect(app.matchesSeverity("low", "high")).toBe(false);
    expect(app.matchesSeverity("low", "all")).toBe(true);

    const ruleTarget = app.buildRuleSearchTarget({
      ruleId: "rule-1",
      description: "Needs label",
      teamName: "team-a",
      severity: "high"
    });
    expect(ruleTarget).toContain("rule-1");
    expect(ruleTarget).toContain("Needs label");

    const badge = app.renderBadge({ label: "Rule-1", count: 2, variant: "rule" });
    expect(badge).toContain("badge--rule");
    expect(badge).toContain("Rule-1");
    expect(badge).toContain("2");

    const badgeNoCount = app.renderBadge({ label: "No Count", variant: "team" });
    expect(badgeNoCount).toContain("badge--team");
    expect(badgeNoCount).not.toContain("badge-count");

    const badgeFallback = app.renderBadge({ label: null, variant: "rule" });
    expect(badgeFallback).toContain("Unknown");

    const badgeDefault = app.renderBadge({ label: "Default" });
    expect(badgeDefault).toContain("badge--rule");

    const group = app.renderBadgeGroup([{ ruleId: "rule-1", count: 1 }], "ruleId", { variant: "rule" });
    expect(group).toContain("badge-group");
    expect(group).toContain("badge--rule");

    const groupDefault = app.renderBadgeGroup([{ ruleId: "rule-2", count: 1 }], "ruleId");
    expect(groupDefault).toContain("badge--rule");

    const emptyGroup = app.renderBadgeGroup([], "ruleId", { variant: "rule" });
    expect(emptyGroup).toContain("—");

    const nullGroup = app.renderBadgeGroup(null, "ruleId", { variant: "rule" });
    expect(nullGroup).toContain("—");

    const resolvedGroup = app.renderBadgeGroup(
      [{ severity: "critical", count: 1 }],
      "severity",
      { variantResolver: app.resolveSeverityVariant }
    );
    expect(resolvedGroup).toContain("badge--severity-high");

    expect(app.formatCounts([], "ruleId")).toBe("—");
    expect(app.formatCounts([{ ruleId: "rule-1", count: 2 }], "ruleId")).toBe("rule-1 (2)");
  });

  test("extractDomain and wildcard matching handle edge cases", () => {
    const app = require("../src/listener/ui/assets/app");
    expect(app.extractDomain("file-a.html")).toBe("");
    expect(app.extractDomain("http://%")).toBe("");
    expect(app.extractDomain("https://sub.example.com/path")).toBe("sub.example.com");
    expect(app.matchesWildcard("example.com", "")).toBe(true);
    expect(app.matchesWildcard("example.com", "*")).toBe(true);
    expect(app.matchesWildcard("", "*.example.com")).toBe(false);
    expect(app.matchesDomainQuery("https://app.example.com", "*.example.com")).toBe(true);
    expect(app.matchesDomainQuery("https://other.test", "*.example.com")).toBe(false);
  });

  test("filters by rule query, file query, and severity", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 2, files: 2 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "Must have label",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: ["file-a"]
        },
        {
          ruleId: "rule-2",
          description: "Low issue",
          severity: "low",
          teamName: "team-b",
          count: 1,
          files: ["file-b"]
        }
      ],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          teams: [{ teamName: "team-a", count: 1 }],
          severities: [{ severity: "high", count: 1 }],
          linkedStylesheetsWithIssues: []
        },
        {
          filePath: "file-b",
          issueCount: 1,
          rules: [{ ruleId: "rule-2", count: 1 }],
          teams: [{ teamName: "team-b", count: 1 }],
          severities: [{ severity: "low", count: 1 }],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.issues = [
      { message: "Issue A", ruleId: "rule-1", filePath: "file-a", severity: "high" },
      { message: "Issue B", ruleId: "rule-2", filePath: "file-b", severity: "low" }
    ];

    app.elements.ruleSearchInput.value = "rule-1";
    app.elements.fileSearchInput.value = "file-a";
    app.elements.severityFilterSelect.value = "high";

    app.renderAll();

    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
    expect(app.elements.ruleTable.innerHTML).not.toContain("rule-2");
    expect(app.elements.fileTable.innerHTML).toContain("file-a");
    expect(app.elements.fileTable.innerHTML).not.toContain("file-b");
    expect(app.elements.issueFeed.innerHTML).toContain("Issue A");
    expect(app.elements.issueFeed.innerHTML).not.toContain("Issue B");
    expect(app.elements.ruleResultCount.textContent).toBe("1 of 2");
  });

  test("filters by domain with wildcard support", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 2, files: 2 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: ["https://app.example.com/page-a"]
        },
        {
          ruleId: "rule-2",
          description: "desc",
          severity: "low",
          teamName: "team-b",
          count: 1,
          files: ["https://other.test/page-b"]
        }
      ],
      byFile: [
        {
          filePath: "https://app.example.com/page-a",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          teams: [{ teamName: "team-a", count: 1 }],
          severities: [{ severity: "high", count: 1 }],
          linkedStylesheetsWithIssues: []
        },
        {
          filePath: "https://other.test/page-b",
          issueCount: 1,
          rules: [{ ruleId: "rule-2", count: 1 }],
          teams: [{ teamName: "team-b", count: 1 }],
          severities: [{ severity: "low", count: 1 }],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.issues = [
      { message: "Issue A", ruleId: "rule-1", filePath: "https://app.example.com/page-a", severity: "high" },
      { message: "Issue B", ruleId: "rule-2", filePath: "https://other.test/page-b", severity: "low" }
    ];

    app.elements.domainSearchInput.value = "*.example.com";

    app.renderAll();

    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
    expect(app.elements.ruleTable.innerHTML).not.toContain("rule-2");
    expect(app.elements.fileTable.innerHTML).toContain("app.example.com");
    expect(app.elements.fileTable.innerHTML).not.toContain("other.test");
    expect(app.elements.issueFeed.innerHTML).toContain("Issue A");
    expect(app.elements.issueFeed.innerHTML).not.toContain("Issue B");
  });

  test("resetFilters clears inputs safely", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.ruleSearchInput.value = "rule";
    app.elements.fileSearchInput.value = "file";
    app.elements.domainSearchInput.value = "example.com";
    app.elements.severityFilterSelect.value = "high";

    app.resetFilters();

    expect(app.elements.ruleSearchInput.value).toBe("");
    expect(app.elements.fileSearchInput.value).toBe("");
    expect(app.elements.domainSearchInput.value).toBe("");
    expect(app.elements.severityFilterSelect.value).toBe("all");
  });

  test("resetFilters skips missing inputs safely", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.ruleSearchInput = null;
    app.elements.fileSearchInput = null;
    app.elements.domainSearchInput = null;
    app.elements.severityFilterSelect = null;

    expect(() => app.resetFilters()).not.toThrow();
    expect(app.state.filters).toEqual({
      ruleQuery: "",
      fileQuery: "",
      domainQuery: "",
      severity: "all"
    });
  });

  test("syncFiltersFromInputs handles missing inputs", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.ruleSearchInput = null;
    app.elements.fileSearchInput = null;
    app.elements.domainSearchInput = null;
    app.elements.severityFilterSelect = null;

    app.syncFiltersFromInputs();

    expect(app.state.filters).toEqual({
      ruleQuery: "",
      fileQuery: "",
      domainQuery: "",
      severity: "all"
    });
  });

  test("bindEvents prevents duplicate bindings", () => {
    const app = require("../src/listener/ui/assets/app");
    const ruleSpy = jest.spyOn(app.elements.ruleSearchInput, "addEventListener");
    const fileSpy = jest.spyOn(app.elements.fileSearchInput, "addEventListener");

    app.bindEvents();
    app.bindEvents();

    expect(ruleSpy).toHaveBeenCalledTimes(1);
    expect(fileSpy).toHaveBeenCalledTimes(1);
    ruleSpy.mockRestore();
    fileSpy.mockRestore();
  });

  test("setActiveTab toggles runtime panels", () => {
    const app = require("../src/listener/ui/assets/app");
    const rulesButton = app.elements.tabButtons.find((button) => button.dataset.tabTarget === "rules");
    const rulesPanel = app.elements.tabPanels.find((panel) => panel.dataset.tabPanel === "rules");
    const issuesPanel = app.elements.tabPanels.find((panel) => panel.dataset.tabPanel === "issues");
    const sharedPanel = app.elements.tabPanels.find((panel) => panel.dataset.tabPanel === "shared");

    app.setActiveTab("rules");

    expect(rulesButton.getAttribute("aria-selected")).toBe("true");
    expect(rulesPanel.hidden).toBe(false);
    expect(sharedPanel.hidden).toBe(false);
    expect(issuesPanel.hidden).toBe(true);

    app.setActiveTab("home");
    expect(issuesPanel.hidden).toBe(false);
  });

  test("setActiveTab returns early without a tab shell", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.tabShell = null;

    expect(() => app.setActiveTab("rules")).not.toThrow();
  });

  test("setActiveTab falls back to default tab IDs", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.tabShell.dataset.activeTab = "";
    app.elements.tabButtons = [];

    app.setActiveTab();
    expect(app.elements.tabShell.dataset.activeTab).toBe("home");

    app.elements.tabShell.dataset.activeTab = "";
    app.elements.tabButtons = [{ dataset: { tabTarget: "rules" }, setAttribute: jest.fn() }];
    app.setActiveTab();
    expect(app.elements.tabShell.dataset.activeTab).toBe("rules");
  });

  test("setActiveTab handles missing tab panels", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.tabPanels = null;

    expect(() => app.setActiveTab("rules")).not.toThrow();
  });

  test("setActiveTab tolerates null tab buttons", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.tabButtons = null;

    expect(() => app.setActiveTab("rules")).not.toThrow();
  });

  test("bindEvents attaches tab handlers", () => {
    const app = require("../src/listener/ui/assets/app");
    const tabButton = app.elements.tabButtons[0];
    const buttonSpy = jest.spyOn(tabButton, "addEventListener");

    app.bindEvents();

    expect(buttonSpy).toHaveBeenCalledWith("click", expect.any(Function));
    buttonSpy.mockRestore();
  });

  test("bindEvents allows missing tab buttons", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.tabButtons = null;

    expect(() => app.bindEvents()).not.toThrow();
  });

  test("renderIssues skips missing result count element", () => {
    const app = require("../src/listener/ui/assets/app");
    app.elements.issueResultCount = null;
    app.state.issues = [
      { message: "Issue A", ruleId: "rule-1", filePath: "file-a", severity: "high" }
    ];

    expect(() => app.renderIssues()).not.toThrow();
    expect(app.elements.issueFeed.innerHTML).toContain("Issue A");
  });

  test("renders empty state when filters remove all rules and files", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: ["file-a"]
        }
      ],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          teams: [{ teamName: "team-a", count: 1 }],
          severities: [{ severity: "high", count: 1 }],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };

    app.elements.ruleSearchInput.value = "missing";
    app.elements.fileSearchInput.value = "missing";

    app.renderAll();

    expect(app.elements.ruleTable.innerHTML).toContain("No rules match the current filters.");
    expect(app.elements.fileTable.innerHTML).toContain("No files match the current filters.");
  });

  test("renderFiles skips missing result count element", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          teams: [],
          severities: [],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.elements.fileResultCount = null;

    expect(() => app.renderFiles()).not.toThrow();
    expect(app.elements.fileTable.innerHTML).toContain("file-a");
  });

  test("renderBreakdowns falls back to empty arrays", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 0, issues: 0, files: 0 },
      byRule: [],
      byFile: [],
      byTeam: [],
      bySeverity: undefined,
      byCheck: undefined
    };

    app.renderBreakdowns();

    expect(app.elements.severityBreakdown.innerHTML).toContain("—");
    expect(app.elements.checkBreakdown.innerHTML).toContain("—");
  });

  test("renderRules skips missing result count element", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: ["file-a"]
        }
      ],
      byFile: [],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.elements.ruleResultCount = null;

    expect(() => app.renderRules()).not.toThrow();
    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
  });

  test("renderFiles treats empty severity as no filter", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [],
          teams: [],
          severities: [],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.filters.severity = "";

    app.renderFiles();

    expect(app.elements.fileTable.innerHTML).toContain("file-a");
  });

  test("renderRules applies domain filters directly", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: ["https://app.example.com/page-a"]
        }
      ],
      byFile: [],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.filters.domainQuery = "*.example.com";

    app.renderRules();

    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
  });

  test("renderRules handles missing file lists with a domain filter", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [
        {
          ruleId: "rule-1",
          description: "desc",
          severity: "high",
          teamName: "team-a",
          count: 1,
          files: undefined
        }
      ],
      byFile: [],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.filters.domainQuery = "*.example.com";

    app.renderRules();

    expect(app.elements.ruleTable.innerHTML).toContain("No rules match the current filters.");
  });

  test("renderFiles applies severity filtering when not all", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [],
          teams: [],
          severities: [{ severity: "high", count: 1 }],
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.filters.severity = "high";

    app.renderFiles();

    expect(app.elements.fileTable.innerHTML).toContain("file-a");
  });

  test("renderFiles handles missing severities when filtering", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = {
      summary: { documents: 1, issues: 1, files: 1 },
      byRule: [],
      byFile: [
        {
          filePath: "file-a",
          issueCount: 1,
          rules: [],
          teams: [],
          severities: undefined,
          linkedStylesheetsWithIssues: []
        }
      ],
      byTeam: [],
      bySeverity: [],
      byCheck: []
    };
    app.state.filters.severity = "high";

    app.renderFiles();

    expect(app.elements.fileTable.innerHTML).toContain("No files match the current filters.");
  });
});
