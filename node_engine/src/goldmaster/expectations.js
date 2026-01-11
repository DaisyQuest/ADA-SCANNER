const fs = require("fs");
const path = require("path");

const buildExpectationsFileName = (documentPath) => {
  const parsed = path.parse(documentPath);
  return path.join(parsed.dir, `${parsed.name}.expectations.json`);
};

const normalizeRules = (rules, documentPath) => {
  if (!Array.isArray(rules)) {
    throw new Error(`GoldMaster expectations must include a rules array for ${documentPath}.`);
  }

  const normalized = rules.map((rule) => {
    if (typeof rule !== "string" || !rule.trim()) {
      throw new Error(`GoldMaster expectations rules must be non-empty strings for ${documentPath}.`);
    }
    return rule.trim();
  });

  return Array.from(new Set(normalized)).sort();
};

const loadGoldMasterExpectations = ({ rootDir, documentPath }) => {
  const expectationRelative = buildExpectationsFileName(documentPath);
  const expectationPath = path.join(rootDir, expectationRelative);
  if (!fs.existsSync(expectationPath)) {
    throw new Error(`Missing GoldMaster expectations for ${documentPath}.`);
  }

  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(expectationPath, "utf-8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Invalid GoldMaster expectations JSON for ${documentPath}: ${message}`);
  }

  const rules = normalizeRules(payload?.rules, documentPath);

  return {
    rules,
    expectationPath
  };
};

const buildRulesByFile = (issues = []) => {
  const byFile = new Map();
  for (const issue of issues) {
    const filePath = issue?.filePath ?? "";
    if (!filePath) {
      continue;
    }
    if (!byFile.has(filePath)) {
      byFile.set(filePath, new Set());
    }
    const ruleId = issue?.ruleId;
    if (ruleId) {
      byFile.get(filePath).add(ruleId);
    }
  }
  return byFile;
};

const compareRuleSets = ({ documentPath, expectedRules, actualRules }) => {
  const expected = new Set(expectedRules);
  const actual = new Set(actualRules);
  const missing = expectedRules.filter((rule) => !actual.has(rule));
  const unexpected = actualRules.filter((rule) => !expected.has(rule));
  if (!missing.length && !unexpected.length) {
    return null;
  }
  return {
    documentPath,
    missing,
    unexpected
  };
};

const evaluateGoldMasterExpectations = ({ rootDir, documents = [], issues = [] } = {}) => {
  const rulesByFile = buildRulesByFile(issues);
  const results = [];
  const totals = {
    totalDocuments: 0,
    matched: 0,
    mismatched: 0,
    missing: 0,
    invalid: 0,
    skipped: 0
  };
  for (const document of documents) {
    const documentPath = document?.url;
    if (!documentPath) {
      totals.skipped += 1;
      results.push({
        documentPath: null,
        status: "skipped",
        message: "Document URL missing from scan results."
      });
      continue;
    }
    totals.totalDocuments += 1;
    let expectedRules = [];
    let expectationPath = null;
    try {
      ({ rules: expectedRules, expectationPath } = loadGoldMasterExpectations({ rootDir, documentPath }));
    } catch (error) {
      const message = String(error);
      const isMissing = message.includes("Missing GoldMaster expectations");
      const status = isMissing ? "missing" : "invalid";
      totals[status] += 1;
      results.push({
        documentPath,
        status,
        message
      });
      continue;
    }
    const actualRules = Array.from(rulesByFile.get(documentPath) ?? []).sort();
    const mismatch = compareRuleSets({ documentPath, expectedRules, actualRules });
    if (mismatch) {
      totals.mismatched += 1;
      results.push({
        documentPath,
        expectationPath,
        status: "mismatch",
        expectedRules,
        actualRules,
        missing: mismatch.missing,
        unexpected: mismatch.unexpected
      });
      continue;
    }
    totals.matched += 1;
    results.push({
      documentPath,
      expectationPath,
      status: "match",
      expectedRules,
      actualRules
    });
  }

  return { totals, results };
};

const formatExpectationFailure = (entry) => {
  if (entry.status === "mismatch") {
    return `- ${entry.documentPath}: missing=${JSON.stringify(entry.missing)}, unexpected=${JSON.stringify(entry.unexpected)}`;
  }
  return `- ${entry.documentPath}: ${entry.message}`;
};

const validateGoldMasterExpectations = ({ rootDir, documents = [], issues = [] } = {}) => {
  const evaluation = evaluateGoldMasterExpectations({ rootDir, documents, issues });
  const failures = evaluation.results.filter(
    (entry) => entry.status !== "match" && entry.status !== "skipped"
  );
  if (failures.length) {
    const details = failures.map(formatExpectationFailure).join("\n");
    throw new Error(`GoldMaster expectations mismatch:\n${details}`);
  }
  return evaluation;
};

module.exports = {
  buildExpectationsFileName,
  loadGoldMasterExpectations,
  evaluateGoldMasterExpectations,
  validateGoldMasterExpectations
};
