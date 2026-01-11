const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  buildExpectationsFileName,
  loadGoldMasterExpectations,
  validateGoldMasterExpectations
} = require("../src/goldmaster/expectations");

describe("goldmaster expectations helpers", () => {
  test("buildExpectationsFileName preserves nested paths and swaps extensions", () => {
    expect(buildExpectationsFileName("gm-html-001.html")).toBe("gm-html-001.expectations.json");
    expect(buildExpectationsFileName("nested/gm-html-002.htm")).toBe("nested/gm-html-002.expectations.json");
  });

  test("loadGoldMasterExpectations throws when expectations file is missing", () => {
    expect(() => loadGoldMasterExpectations({ rootDir: "/tmp", documentPath: "doc.html" }))
      .toThrow("Missing GoldMaster expectations for doc.html.");
  });

  test("loadGoldMasterExpectations throws for invalid JSON and invalid rules", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-expect-"));
    fs.writeFileSync(path.join(rootDir, "doc.expectations.json"), "{bad}");
    expect(() => loadGoldMasterExpectations({ rootDir, documentPath: "doc.html" }))
      .toThrow("Invalid GoldMaster expectations JSON for doc.html:");

    fs.writeFileSync(path.join(rootDir, "doc.expectations.json"), JSON.stringify({ rules: [null] }));
    expect(() => loadGoldMasterExpectations({ rootDir, documentPath: "doc.html" }))
      .toThrow("GoldMaster expectations rules must be non-empty strings for doc.html.");
  });

  test("validateGoldMasterExpectations compares expected and actual rules", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-validate-"));
    fs.writeFileSync(
      path.join(rootDir, "doc.expectations.json"),
      JSON.stringify({ rules: ["rule-1"] }, null, 2)
    );
    const documents = [{ url: "doc.html" }];
    const issues = [{ filePath: "doc.html", ruleId: "rule-2" }];

    expect(() => validateGoldMasterExpectations({ rootDir, documents, issues }))
      .toThrow("GoldMaster expectations mismatch for doc.html:");

    validateGoldMasterExpectations({
      rootDir,
      documents,
      issues: [{ filePath: "doc.html", ruleId: "rule-1" }]
    });
  });
});
