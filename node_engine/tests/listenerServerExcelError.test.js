const fs = require("fs");
const path = require("path");
const os = require("os");

const createTempRules = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ada-listener-"));
  const teamDir = path.join(root, "team");
  fs.mkdirSync(teamDir, { recursive: true });
  fs.writeFileSync(
    path.join(teamDir, "rule.json"),
    JSON.stringify({
      id: "rule-1",
      description: "desc",
      severity: "low",
      checkId: "missing-label",
      appliesTo: "html"
    })
  );
  return root;
};

describe("ListenerServer excel export errors", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("returns an error when excel export fails", async () => {
    jest.doMock("../src/listener/ReportExporter", () => ({
      buildCsvReport: jest.fn(() => "csv"),
      buildExcelReport: jest.fn(() => Promise.reject(new Error("boom")))
    }));

    const { ListenerServer } = require("../src/listener/ListenerServer");
    const rulesRoot = createTempRules();
    const server = new ListenerServer({ rulesRoot });
    const port = await server.start();

    const response = await fetch(`http://localhost:${port}/report?format=excel`);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Failed to build Excel export.");

    await server.stop();
  });
});
