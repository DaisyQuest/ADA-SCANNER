/** @jest-environment jsdom */

const setupDom = () => {
  document.body.innerHTML = `
    <div id="connectionStatus"></div>
    <span id="lastUpdated"></span>
    <div id="documentCount"></div>
    <div id="fileCount"></div>
    <div id="issueCount"></div>
    <div id="ruleCount"></div>
    <input id="fileSearchInput" />
    <input id="issueSearchInput" />
    <select id="ruleFilterSelect">
      <option value="all">All rules</option>
    </select>
    <select id="severityFilterSelect">
      <option value="all">All severities</option>
      <option value="high">High</option>
    </select>
    <button id="clearFilters"></button>
    <div id="fileResultCount"></div>
    <div id="issueResultCount"></div>
    <table><tbody id="fileTable"></tbody></table>
    <div id="issueFeed"></div>
  `;
};

const createResponse = (payload) => Promise.resolve({ json: () => Promise.resolve(payload) });

describe("Static analysis UI app", () => {
  const originalFetch = global.fetch;

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

    delete window.__ADA_SCANNER_FORCE_BOOTSTRAP__;
  });

  test("renders summary, files, and issues", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 2, issues: 1 },
      byRule: [{ ruleId: "rule-1", count: 1 }],
      byFile: [
        {
          filePath: "file-a.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          linkedStylesheetsWithIssues: [{ filePath: "styles.css", count: 2 }],
          severities: [{ severity: "high", count: 1 }]
        },
        {
          filePath: "file-b.js",
          issueCount: 0,
          rules: [],
          linkedStylesheetsWithIssues: [],
          severities: []
        }
      ]
    };
    app.state.documents = [{ url: "file-a.html" }];
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html", line: 1, teamName: "team-a" }
    ];

    app.renderAll();

    expect(app.elements.fileCount.textContent).toBe("2");
    expect(app.elements.documentCount.textContent).toBe("1");
    expect(app.elements.issueCount.textContent).toBe("1");
    expect(app.elements.ruleCount.textContent).toBe("1");
    expect(app.elements.fileTable.innerHTML).toContain("file-a.html");
    expect(app.elements.fileTable.innerHTML).toContain("Save JSON");
    expect(app.elements.fileTable.innerHTML).toContain("styles.css (2)");
    expect(app.elements.fileTable.innerHTML).toContain("high (1)");
    expect(app.elements.issueFeed.innerHTML).toContain("Problem");
    expect(app.elements.fileResultCount.textContent).toBe("2 of 2");
    expect(app.elements.issueResultCount.textContent).toBe("1 of 1");
  });

  test("handles empty issue feed and connection state", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = null;
    app.state.issues = [];

    app.renderSummary();
    expect(app.elements.fileCount.textContent).toBe("0");
    expect(app.elements.issueCount.textContent).toBe("0");

    app.renderFiles();
    expect(app.elements.fileTable.innerHTML).toBe("");

    app.renderIssues();
    expect(app.elements.issueFeed.innerHTML).toContain("No issues detected yet.");

    app.setConnectionStatus(false);
    expect(app.elements.connectionStatus.textContent).toBe("Offline");

    app.setConnectionStatus(true);
    expect(app.elements.connectionStatus.textContent).toBe("Ready");
  });

  test("renders filters safely without a report", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = null;
    app.elements.ruleFilterSelect.value = "all";

    app.renderAll();

    expect(app.elements.ruleFilterSelect.innerHTML).toContain("All rules");
  });

  test("normalizes text and matches queries", () => {
    const app = require("../src/static/ui/assets/app");
    expect(app.normalizeText("HeLLo")).toBe("hello");
    expect(app.normalizeText(null)).toBe("");
    expect(app.matchesQuery("File-A", "file")).toBe(true);
    expect(app.matchesQuery("File-A", "")).toBe(true);
    expect(app.matchesQuery("File-A", "missing")).toBe(false);
  });

  test("resolves severity variants and badges", () => {
    const app = require("../src/static/ui/assets/app");
    expect(app.normalizeToken("High Severity")).toBe("high-severity");
    expect(app.resolveSeverityVariant("High")).toBe("severity-high");
    expect(app.resolveSeverityVariant("Medium")).toBe("severity-medium");
    expect(app.resolveSeverityVariant("Low")).toBe("severity-low");
    expect(app.resolveSeverityVariant("")).toBe("severity-unknown");
    expect(app.matchesSeverity("high", "high")).toBe(true);
    expect(app.matchesSeverity("low", "high")).toBe(false);
    expect(app.matchesSeverity("low", "all")).toBe(true);

    const badge = app.renderBadge("High", "high");
    expect(badge).toContain("badge--severity-high");
    expect(badge).toContain("High");
  });

  test("builds rule options sorted by count", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 0, issues: 0 },
      byRule: [
        { ruleId: "rule-2", count: 1 },
        { ruleId: "rule-1", count: 3 }
      ],
      byFile: []
    };

    const options = app.getRuleOptions();
    expect(options).toEqual([
      { id: "rule-1", label: "rule-1 (3)" },
      { id: "rule-2", label: "rule-2 (1)" }
    ]);
  });

  test("matches rule filters and builds issue search targets", () => {
    const app = require("../src/static/ui/assets/app");
    const rules = [{ ruleId: "rule-1" }];
    expect(app.matchesRule("all", rules)).toBe(true);
    expect(app.matchesRule("rule-1", rules)).toBe(true);
    expect(app.matchesRule("rule-2", rules)).toBe(false);
    expect(app.matchesRule("rule-2", null)).toBe(false);

    const target = app.buildIssueSearchTarget({
      message: "Missing alt",
      ruleId: "rule-1",
      filePath: "file-a.html",
      teamName: "team-a"
    });
    expect(target).toContain("Missing alt");
    expect(target).toContain("rule-1");
    expect(target).toContain("file-a.html");
    expect(target).toContain("team-a");
  });

  test("getFilteredFiles returns empty when report is missing", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = null;
    expect(app.getFilteredFiles()).toEqual([]);
  });

  test("getFilteredIssues treats empty ruleId as all", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.filters = { fileQuery: "", issueQuery: "", ruleId: "" };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html" }
    ];

    expect(app.getFilteredIssues()).toHaveLength(1);
  });

  test("syncFiltersFromInputs falls back when inputs are missing", () => {
    const app = require("../src/static/ui/assets/app");
    app.elements.fileSearchInput = null;
    app.elements.issueSearchInput = null;
    app.elements.ruleFilterSelect = null;
    app.elements.severityFilterSelect = null;

    app.syncFiltersFromInputs();

    expect(app.state.filters).toEqual({
      fileQuery: "",
      issueQuery: "",
      ruleId: "all",
      severity: "all"
    });
  });

  test("resetFilters handles missing inputs", () => {
    const app = require("../src/static/ui/assets/app");
    app.elements.fileSearchInput = null;
    app.elements.issueSearchInput = null;
    app.elements.ruleFilterSelect = null;
    app.elements.severityFilterSelect = null;

    expect(() => app.resetFilters()).not.toThrow();
  });

  test("renderSummary handles missing document count", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = { summary: { files: 1, issues: 1 }, byRule: [], byFile: [] };
    app.elements.documentCount = null;

    expect(() => app.renderSummary()).not.toThrow();
  });

  test("renderFilters safely exits when select is missing", () => {
    const app = require("../src/static/ui/assets/app");
    app.elements.ruleFilterSelect = null;
    expect(() => app.renderFilters()).not.toThrow();
  });

  test("renderFiles handles missing result count element", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 1, issues: 0 },
      byRule: [],
      byFile: [
        { filePath: "file-a.html", issueCount: 0, rules: [] }
      ]
    };
    app.elements.fileResultCount = null;

    app.renderFiles();
    expect(app.elements.fileTable.innerHTML).toContain("file-a.html");
  });

  test("renderIssues handles missing result count element", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html" }
    ];
    app.elements.issueResultCount = null;

    app.renderIssues();
    expect(app.elements.issueFeed.innerHTML).toContain("Problem");
  });

  test("bindEvents prevents duplicate bindings", () => {
    const app = require("../src/static/ui/assets/app");
    app.bindEvents();
    const firstState = app.bindEvents.bound;
    app.bindEvents();
    expect(app.bindEvents.bound).toBe(true);
    expect(firstState).toBe(true);
  });

  test("filters files and issues by rule and query", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 2, issues: 2 },
      byRule: [
        { ruleId: "rule-1", count: 1 },
        { ruleId: "rule-2", count: 1 }
      ],
      byFile: [
        {
          filePath: "file-a.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }],
          severities: [{ severity: "high", count: 1 }]
        },
        {
          filePath: "file-b.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-2", count: 1 }],
          severities: [{ severity: "low", count: 1 }]
        }
      ]
    };
    app.state.issues = [
      { message: "A issue", ruleId: "rule-1", filePath: "file-a.html", severity: "high" },
      { message: "B issue", ruleId: "rule-2", filePath: "file-b.html", severity: "low" }
    ];

    app.elements.fileSearchInput.value = "file-b";
    app.elements.issueSearchInput.value = "B issue";

    app.renderAll();
    app.elements.ruleFilterSelect.value = "rule-2";
    app.elements.severityFilterSelect.value = "low";
    app.renderAll();

    expect(app.elements.fileTable.innerHTML).toContain("file-b.html");
    expect(app.elements.fileTable.innerHTML).not.toContain("file-a.html");
    expect(app.elements.issueFeed.innerHTML).toContain("B issue");
    expect(app.elements.issueFeed.innerHTML).not.toContain("A issue");
    expect(app.elements.fileResultCount.textContent).toBe("1 of 2");
    expect(app.elements.issueResultCount.textContent).toBe("1 of 2");
  });

  test("renders empty state when filters remove all files", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 1, issues: 1 },
      byRule: [{ ruleId: "rule-1", count: 1 }],
      byFile: [
        {
          filePath: "file-a.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }]
        }
      ]
    };

    app.elements.fileSearchInput.value = "missing";
    app.renderAll();

    expect(app.elements.fileTable.innerHTML).toContain("No files match");
    expect(app.elements.fileResultCount.textContent).toBe("0 of 1");
  });

  test("renders issue empty state when filters remove all issues", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 1, issues: 1 },
      byRule: [{ ruleId: "rule-1", count: 1 }],
      byFile: [
        {
          filePath: "file-a.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }]
        }
      ]
    };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html" }
    ];
    app.elements.issueSearchInput.value = "not-there";

    app.renderAll();

    expect(app.elements.issueFeed.innerHTML).toContain("No issues match the current filters.");
    expect(app.elements.issueResultCount.textContent).toBe("0 of 1");
  });

  test("clear filters resets inputs and results", () => {
    const app = require("../src/static/ui/assets/app");
    app.state.report = {
      summary: { files: 1, issues: 1 },
      byRule: [{ ruleId: "rule-1", count: 1 }],
      byFile: [
        {
          filePath: "file-a.html",
          issueCount: 1,
          rules: [{ ruleId: "rule-1", count: 1 }]
        }
      ]
    };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html" }
    ];
    app.elements.fileSearchInput.value = "file-a";
    app.elements.issueSearchInput.value = "Problem";
    app.elements.ruleFilterSelect.value = "rule-1";
    app.elements.severityFilterSelect.value = "all";

    app.renderAll();
    app.resetFilters();

    expect(app.elements.fileSearchInput.value).toBe("");
    expect(app.elements.issueSearchInput.value).toBe("");
    expect(app.elements.ruleFilterSelect.value).toBe("all");
    expect(app.elements.severityFilterSelect.value).toBe("all");
    expect(app.elements.fileResultCount.textContent).toBe("1 of 1");
  });

  test("loads initial data and updates state", async () => {
    const app = require("../src/static/ui/assets/app");
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({ documents: [{ url: "file-a" }] }))
      .mockReturnValueOnce(createResponse({ issues: [{ ruleId: "rule-1" }] }))
      .mockReturnValueOnce(createResponse({
        summary: { files: 1, issues: 1 },
        byRule: [],
        byFile: []
      }));

    await app.loadInitialData();
    expect(app.state.documents).toHaveLength(1);
    expect(app.state.issues).toHaveLength(1);
    expect(app.elements.fileCount.textContent).toBe("1");
    expect(app.elements.documentCount.textContent).toBe("1");
    expect(app.elements.ruleFilterSelect.innerHTML).toContain("All rules");
  });

  test("loadInitialData defaults missing arrays", async () => {
    const app = require("../src/static/ui/assets/app");
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({}))
      .mockReturnValueOnce(createResponse({}))
      .mockReturnValueOnce(createResponse({
        summary: { files: 0, issues: 0 },
        byRule: [],
        byFile: []
      }));

    await app.loadInitialData();
    expect(app.state.documents).toEqual([]);
    expect(app.state.issues).toEqual([]);
  });

  test("builds download names with empty values", () => {
    const app = require("../src/static/ui/assets/app");
    expect(app.buildDownloadName("", "html")).toBe("report.html");
  });

  test("bootstraps when forced", async () => {
    jest.resetModules();
    setupDom();
    window.__ADA_SCANNER_FORCE_BOOTSTRAP__ = true;

    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({ documents: [] }))
      .mockReturnValueOnce(createResponse({ issues: [] }))
      .mockReturnValueOnce(createResponse({
        summary: { files: 0, issues: 0 },
        byRule: [],
        byFile: []
      }));

    require("../src/static/ui/assets/app");
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalled();
    const app = require("../src/static/ui/assets/app");
    app.elements.fileSearchInput.value = "file";
    app.elements.issueSearchInput.value = "issue";
    app.elements.ruleFilterSelect.value = "all";
    app.elements.clearFiltersButton.dispatchEvent(new Event("click"));
    expect(app.elements.fileSearchInput.value).toBe("");
  });

  test("bootstrap handles load errors", async () => {
    jest.resetModules();
    setupDom();
    window.__ADA_SCANNER_FORCE_BOOTSTRAP__ = true;

    global.fetch = jest.fn().mockRejectedValue(new Error("boom"));

    require("../src/static/ui/assets/app");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const app = require("../src/static/ui/assets/app");
    expect(app.elements.connectionStatus.textContent).toBe("Offline");
  });
});
