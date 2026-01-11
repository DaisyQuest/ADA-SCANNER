const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  buildExpectationsFileName,
  evaluateGoldMasterExpectations,
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

  test("loadGoldMasterExpectations throws when rules array is missing", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-expect-missing-rules-"));
    fs.writeFileSync(path.join(rootDir, "doc.expectations.json"), JSON.stringify({}));
    expect(() => loadGoldMasterExpectations({ rootDir, documentPath: "doc.html" }))
      .toThrow("GoldMaster expectations must include a rules array for doc.html.");
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
      .toThrow("GoldMaster expectations mismatch:");

    const evaluation = validateGoldMasterExpectations({
      rootDir,
      documents,
      issues: [{ filePath: "doc.html", ruleId: "rule-1" }]
    });
    expect(evaluation.totals.matched).toBe(1);
  });

  test("evaluateGoldMasterExpectations reports missing expectation files", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-eval-missing-"));
    const documents = [{ url: "doc.html" }];

    const evaluation = evaluateGoldMasterExpectations({ rootDir, documents, issues: [] });

    expect(evaluation.totals.missing).toBe(1);
    expect(evaluation.results[0].status).toBe("missing");
  });

  test("evaluateGoldMasterExpectations reports invalid expectation payloads", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-eval-invalid-"));
    fs.writeFileSync(path.join(rootDir, "doc.expectations.json"), "{bad}");
    const documents = [{ url: "doc.html" }];

    const evaluation = evaluateGoldMasterExpectations({ rootDir, documents, issues: [] });

    expect(evaluation.totals.invalid).toBe(1);
    expect(evaluation.results[0].status).toBe("invalid");
  });

  test("evaluateGoldMasterExpectations marks documents without URLs as skipped", () => {
    const evaluation = evaluateGoldMasterExpectations({
      rootDir: "/tmp",
      documents: [{}],
      issues: []
    });

    expect(evaluation.totals.skipped).toBe(1);
    expect(evaluation.results[0].status).toBe("skipped");
  });

  test("evaluateGoldMasterExpectations reports mismatches and matches", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-eval-match-"));
    fs.writeFileSync(
      path.join(rootDir, "doc.expectations.json"),
      JSON.stringify({ rules: ["rule-1"] }, null, 2)
    );
    const documents = [{ url: "doc.html" }];

    const mismatchEvaluation = evaluateGoldMasterExpectations({
      rootDir,
      documents,
      issues: [{ filePath: "doc.html", ruleId: "rule-2" }]
    });
    expect(mismatchEvaluation.totals.mismatched).toBe(1);
    expect(mismatchEvaluation.results[0].status).toBe("mismatch");

    const matchEvaluation = evaluateGoldMasterExpectations({
      rootDir,
      documents,
      issues: [{ filePath: "doc.html", ruleId: "rule-1" }]
    });
    expect(matchEvaluation.totals.matched).toBe(1);
    expect(matchEvaluation.results[0].status).toBe("match");
  });

  test("evaluateGoldMasterExpectations skips issues without file paths", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-eval-no-file-"));
    fs.writeFileSync(
      path.join(rootDir, "doc.expectations.json"),
      JSON.stringify({ rules: ["rule-1"] }, null, 2)
    );

    const evaluation = evaluateGoldMasterExpectations({
      rootDir,
      documents: [{ url: "doc.html" }],
      issues: [{ ruleId: "rule-1" }]
    });

    expect(evaluation.results[0].status).toBe("mismatch");
    expect(evaluation.results[0].missing).toEqual(["rule-1"]);
  });

  test("validateGoldMasterExpectations includes missing expectation failures in error output", () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "ada-gm-missing-validate-"));
    const documents = [{ url: "doc.html" }];

    expect(() => validateGoldMasterExpectations({ rootDir, documents, issues: [] }))
      .toThrow("Missing GoldMaster expectations for doc.html.");
  });
});
