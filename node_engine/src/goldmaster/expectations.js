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

const validateGoldMasterExpectations = ({ rootDir, documents = [], issues = [] } = {}) => {
  const rulesByFile = buildRulesByFile(issues);
  for (const document of documents) {
    const documentPath = document?.url;
    if (!documentPath) {
      continue;
    }
    const { rules: expectedRules } = loadGoldMasterExpectations({ rootDir, documentPath });
    const actualRules = Array.from(rulesByFile.get(documentPath) ?? []).sort();
    const mismatch = compareRuleSets({ documentPath, expectedRules, actualRules });
    if (mismatch) {
      const details = JSON.stringify({
        missing: mismatch.missing,
        unexpected: mismatch.unexpected
      });
      throw new Error(`GoldMaster expectations mismatch for ${documentPath}: ${details}`);
    }
  }
};

module.exports = {
  buildExpectationsFileName,
  loadGoldMasterExpectations,
  validateGoldMasterExpectations
};
