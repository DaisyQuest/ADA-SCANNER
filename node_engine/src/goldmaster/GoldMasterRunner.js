const fs = require("fs");
const path = require("path");
const { StaticAnalyzer, DEFAULT_EXTENSIONS, DEFAULT_IGNORED_DIRS } = require("../static/StaticAnalyzer");
const { StaticReportBuilder } = require("../static/StaticReportBuilder");
const { SUPPORTED_EXTENSIONS } = require("./options");
const { validateGoldMasterExpectations } = require("./expectations");

const buildExtensionMap = (extensions) => {
  const entries = Array.isArray(extensions) ? extensions : [];
  const map = new Map();
  for (const ext of entries) {
    const entry = DEFAULT_EXTENSIONS.get(ext);
    if (entry) {
      map.set(ext, entry);
    }
  }
  return map;
};

const ensureDirectory = (dirPath) => {
  if (!dirPath) {
    return false;
  }
  fs.mkdirSync(dirPath, { recursive: true });
  return true;
};

const formatExtensionLabel = (ext) => ext.replace(".", "");

const buildGoldMasterReport = ({ report, extension, rootDir, generatedAt }) => ({
  extension,
  rootDir,
  generatedAt,
  report
});

const GoldMaster_Report = ({ report, extension, rootDir, generatedAt }) =>
  buildGoldMasterReport({ report, extension, rootDir, generatedAt });

const runGoldMaster = async ({
  rootDir,
  rulesRoot,
  outputDir,
  extensions = SUPPORTED_EXTENSIONS,
  logger = console,
  analyzerFactory = (extensionMap) =>
    new StaticAnalyzer({ extensionMap, ignoredDirs: DEFAULT_IGNORED_DIRS }),
  reportBuilder = new StaticReportBuilder(),
  expectationsValidator = validateGoldMasterExpectations
} = {}) => {
  if (!rootDir || !rulesRoot || !outputDir) {
    throw new Error("GoldMaster rootDir, rulesRoot, and outputDir are required.");
  }

  ensureDirectory(outputDir);

  const generatedAt = new Date().toISOString();
  const summary = {
    generatedAt,
    rootDir,
    outputDir,
    totalExtensions: extensions.length,
    totalDocuments: 0,
    totalIssues: 0,
    results: []
  };
  const reports = [];

  for (const extension of extensions) {
    const subDir = path.join(rootDir, formatExtensionLabel(extension));
    const extensionMap = buildExtensionMap([extension]);
    if (extensionMap.size === 0) {
      summary.results.push({
        extension,
        rootDir: subDir,
        status: "unsupported",
        documentCount: 0,
        issueCount: 0,
        reportPath: null
      });
      logger.warn(`GoldMaster extension unsupported: ${extension}`);
      continue;
    }
    if (!fs.existsSync(subDir)) {
      summary.results.push({
        extension,
        rootDir: subDir,
        status: "missing",
        documentCount: 0,
        issueCount: 0,
        reportPath: null
      });
      logger.warn(`GoldMaster directory missing for ${extension}: ${subDir}`);
      continue;
    }

    const analyzer = analyzerFactory(extensionMap);
    const scanResult = analyzer.scanRoot({ rootDir: subDir, rulesRoot });
    expectationsValidator({
      rootDir: subDir,
      documents: scanResult.documents,
      issues: scanResult.issues
    });
    const report = reportBuilder.build({
      documents: scanResult.documents,
      issues: scanResult.issues,
      rules: scanResult.rules
    });

    const reportPayload = GoldMaster_Report({
      report,
      extension,
      rootDir: subDir,
      generatedAt
    });

    const reportFileName = `goldmaster-${formatExtensionLabel(extension)}.json`;
    const reportPath = path.join(outputDir, reportFileName);
    fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2));

    const documentCount = report.summary?.documents ?? 0;
    const issueCount = report.summary?.issues ?? 0;

    summary.results.push({
      extension,
      rootDir: subDir,
      status: "complete",
      documentCount,
      issueCount,
      reportPath
    });
    summary.totalDocuments += documentCount;
    summary.totalIssues += issueCount;
    reports.push(reportPayload);
  }

  const summaryPath = path.join(outputDir, "goldmaster-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  return { summaryPath, summary, reports };
};

module.exports = {
  runGoldMaster,
  buildExtensionMap,
  ensureDirectory,
  buildGoldMasterReport,
  GoldMaster_Report
};
