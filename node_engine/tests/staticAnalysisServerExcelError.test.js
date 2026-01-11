const fs = require("fs");
const path = require("path");
const os = require("os");

const createTempRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-static-rules-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify({
      id: "rule-1",
      description: "desc",
      severity: "low",
      checkId: "insufficient-contrast",
      appliesTo: "html"
    })
  );
  return root;
};

describe("StaticAnalysisServer excel export errors", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("returns an error when excel export fails", async () => {
    jest.doMock("../src/listener/ReportExporter", () => ({
      buildCsvReport: jest.fn(() => "csv"),
      buildExcelReport: jest.fn(() => Promise.reject(new Error("boom")))
    }));

    const { StaticAnalysisServer } = require("../src/static/StaticAnalysisServer");
    const rulesRoot = createTempRules();
    const server = new StaticAnalysisServer({
      rules: [{ teamName: "team", rule: { id: "rule-1" } }],
      documents: [],
      issues: [],
      rulesRoot
    });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/report?format=excel`);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Failed to build Excel export.");

    await server.stop();
  });
});
