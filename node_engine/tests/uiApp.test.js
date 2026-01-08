/** @jest-environment jsdom */

const setupDom = () => {
  document.body.innerHTML = `
    <div id="connectionStatus"></div>
    <span id="lastUpdated"></span>
    <div id="documentCount"></div>
    <div id="issueCount"></div>
    <div id="ruleCount"></div>
    <div id="teamCount"></div>
    <div id="fileCount"></div>
    <table><tbody id="ruleTable"></tbody></table>
    <table><tbody id="fileTable"></tbody></table>
    <div id="issueFeed"></div>
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
          checks: [{ checkId: "check-a", count: 3 }]
        },
        {
          filePath: "file-b",
          issueCount: 0,
          rules: [],
          teams: [],
          severities: undefined,
          checks: []
        }
      ],
      byTeam: [{ teamName: "team-a", issueCount: 3, rules: [{ ruleId: "rule-1", count: 3 }] }]
    };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a", line: 1, teamName: "team-a" },
      { message: "Other", ruleId: "rule-2", filePath: "file-b", line: null, teamName: "" }
    ];

    app.renderAll();

    expect(app.elements.documentCount.textContent).toBe("2");
    expect(app.elements.issueCount.textContent).toBe("3");
    expect(app.elements.ruleCount.textContent).toBe("2");
    expect(app.elements.teamCount.textContent).toBe("1");
    expect(app.elements.fileCount.textContent).toBe("1");
    expect(app.elements.ruleTable.innerHTML).toContain("rule-1");
    expect(app.elements.ruleTable.innerHTML).toContain("—");
    expect(app.elements.fileTable.innerHTML).toContain("Save JSON");
    expect(app.elements.fileTable.innerHTML).toContain("report-file-b.json");
    expect(app.elements.issueFeed.innerHTML).toContain("Problem");
    expect(app.elements.issueFeed.innerHTML).toContain("line ?");
  });

  test("clears tables when report is missing", () => {
    const app = require("../src/listener/ui/assets/app");
    app.state.report = null;

    app.renderSummary();
    app.renderRules();
    app.renderFiles();

    expect(app.elements.documentCount.textContent).toBe("0");
    expect(app.elements.issueCount.textContent).toBe("0");
    expect(app.elements.ruleTable.innerHTML).toBe("");
    expect(app.elements.fileTable.innerHTML).toBe("");
  });

  test("loads initial data and updates DOM", async () => {
    const app = require("../src/listener/ui/assets/app");
    global.fetch = jest.fn()
      .mockReturnValueOnce(createResponse({ documents: [{ url: "a" }] }))
      .mockReturnValueOnce(createResponse({ issues: [{ ruleId: "rule-1" }] }))
      .mockReturnValueOnce(createResponse({
        summary: { documents: 1, issues: 1, files: 1 },
        byRule: [],
        byFile: [],
        byTeam: []
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
      .mockReturnValueOnce(createResponse({ summary: { documents: 0, issues: 0, files: 0 }, byRule: [], byFile: [], byTeam: [] }));

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
          summary: { documents: 1, issues: 1, files: 1 },
          byRule: [],
          byFile: [],
          byTeam: []
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
      .mockReturnValueOnce(createResponse({ summary: { documents: 0, issues: 0, files: 0 }, byRule: [], byFile: [], byTeam: [] }));
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
  });
});
