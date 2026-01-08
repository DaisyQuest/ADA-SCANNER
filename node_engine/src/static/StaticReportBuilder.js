const { ReportBuilder } = require("../listener/ReportBuilder");

class StaticReportBuilder {
  constructor({ reportBuilder = new ReportBuilder() } = {}) {
    this.reportBuilder = reportBuilder;
  }

  build({ documents = [], issues = [] } = {}) {
    const base = this.reportBuilder.build({ documents, issues });
    const fileMap = new Map();

    for (const document of documents) {
      if (!document?.url) {
        continue;
      }
      fileMap.set(document.url, {
        filePath: document.url,
        issueCount: 0,
        rules: [],
        teams: [],
        severities: [],
        checks: []
      });
    }

    for (const entry of base.byFile) {
      fileMap.set(entry.filePath, entry);
    }

    const byFile = Array.from(fileMap.values()).sort((a, b) => {
      if (b.issueCount !== a.issueCount) {
        return b.issueCount - a.issueCount;
      }
      return String(a.filePath).localeCompare(String(b.filePath));
    });
    const fileCount = fileMap.size;

    return {
      ...base,
      summary: {
        ...base.summary,
        documents: fileCount,
        files: fileCount
      },
      byFile
    };
  }

  buildFileSummaries({ documents = [], issues = [] } = {}) {
    return this.build({ documents, issues }).byFile;
  }

  buildFileReport({ filePath, documents = [], issues = [] } = {}) {
    return this.reportBuilder.buildFileReport({ filePath, documents, issues });
  }
}

module.exports = { StaticReportBuilder };
