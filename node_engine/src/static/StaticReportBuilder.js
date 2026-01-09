const { ReportBuilder } = require("../listener/ReportBuilder");

class StaticReportBuilder {
  constructor({ reportBuilder = new ReportBuilder() } = {}) {
    this.reportBuilder = reportBuilder;
  }

  build({ documents = [], issues = [] } = {}) {
    const base = this.reportBuilder.build({ documents, issues });
    const fileMap = new Map();
    const stylesheetIssuesByFile = this.reportBuilder.buildStylesheetIssueMap({ documents, issues });

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
        checks: [],
        linkedStylesheetsWithIssues: stylesheetIssuesByFile.get(document.url) ?? [],
        linkedStylesheetIssueCount: this.reportBuilder.sumIssueCounts(stylesheetIssuesByFile.get(document.url))
      });
    }

    for (const entry of base.byFile) {
      fileMap.set(entry.filePath, {
        ...entry,
        linkedStylesheetsWithIssues: entry.linkedStylesheetsWithIssues ?? [],
        linkedStylesheetIssueCount: entry.linkedStylesheetIssueCount ?? 0
      });
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
