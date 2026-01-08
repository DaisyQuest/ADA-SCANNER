/** @jest-environment jsdom */

const setupDom = () => {
  document.body.innerHTML = `
    <div id="connectionStatus"></div>
    <span id="lastUpdated"></span>
    <div id="fileCount"></div>
    <div id="issueCount"></div>
    <div id="ruleCount"></div>
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
          rules: [{ ruleId: "rule-1", count: 1 }]
        },
        {
          filePath: "file-b.js",
          issueCount: 0,
          rules: []
        }
      ]
    };
    app.state.issues = [
      { message: "Problem", ruleId: "rule-1", filePath: "file-a.html", line: 1, teamName: "team-a" }
    ];

    app.renderAll();

    expect(app.elements.fileCount.textContent).toBe("2");
    expect(app.elements.issueCount.textContent).toBe("1");
    expect(app.elements.ruleCount.textContent).toBe("1");
    expect(app.elements.fileTable.innerHTML).toContain("file-a.html");
    expect(app.elements.fileTable.innerHTML).toContain("Save JSON");
    expect(app.elements.issueFeed.innerHTML).toContain("Problem");
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
