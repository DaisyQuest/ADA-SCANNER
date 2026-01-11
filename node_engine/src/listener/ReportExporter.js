const ExcelJS = require("exceljs");

const BASE_COLUMNS = [
  { header: "Rule ID", key: "ruleId", width: 20 },
  { header: "Rule Description", key: "ruleDescription", width: 40 },
  { header: "Severity", key: "severity", width: 14 },
  { header: "Team", key: "teamName", width: 18 },
  { header: "File", key: "filePath", width: 48 },
  { header: "Line", key: "line", width: 8 },
  { header: "Message", key: "message", width: 50 },
  { header: "Check ID", key: "checkId", width: 18 },
  { header: "Recommendation", key: "recommendation", width: 40 },
  { header: "WCAG Criteria", key: "wcagCriteria", width: 24 },
  { header: "Problem Tags", key: "problemTags", width: 24 }
];

const ALGORITHM_COLUMNS = [
  { header: "Algorithm", key: "algorithm", width: 60 },
  { header: "Algorithm (Advanced)", key: "algorithmAdvanced", width: 60 }
];

const getExportColumns = (includeAlgorithm) =>
  includeAlgorithm
    ? [...BASE_COLUMNS, ...ALGORITHM_COLUMNS]
    : BASE_COLUMNS;

const normalizeList = (value) => {
  if (!value) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  return String(value);
};

const buildExportRows = ({ issues = [] } = {}) =>
  issues.map((issue) => ({
    ruleId: issue.ruleId ?? "",
    ruleDescription: issue.ruleDescription ?? "",
    severity: issue.severity ?? "",
    teamName: issue.teamName ?? "",
    filePath: issue.filePath ?? "",
    line: issue.line ?? "",
    message: issue.message ?? "",
    checkId: issue.checkId ?? "",
    recommendation: issue.recommendation ?? "",
    wcagCriteria: normalizeList(issue.wcagCriteria),
    problemTags: normalizeList(issue.problemTags),
    algorithm: issue.algorithm ?? "",
    algorithmAdvanced: issue.algorithmAdvanced ?? ""
  }));

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildCsvReport = ({ issues = [], includeAlgorithm = true } = {}) => {
  const columns = getExportColumns(includeAlgorithm);
  const rows = buildExportRows({ issues });
  const header = columns.map((column) => column.header).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => escapeCsv(row[column.key]))
        .join(",")
    )
    .join("\n");
  return `${header}${body ? `\n${body}` : ""}\n`;
};

const applyHeaderStyle = (cell) => {
  cell.font = { bold: true, color: { argb: "FF1E293B" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" }
  };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = {
    bottom: { style: "thin", color: { argb: "FFCBD5F5" } }
  };
};

const buildExcelReport = async ({ issues = [], includeAlgorithm = true } = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ADA Scanner";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Issues", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  const columns = getExportColumns(includeAlgorithm);
  worksheet.columns = columns;

  const rows = buildExportRows({ issues });
  rows.forEach((row) => worksheet.addRow(row));

  const headerRow = worksheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    row.alignment = { vertical: "top", wrapText: true };
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" }
        };
      });
    }
  });

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  buildCsvReport,
  buildExcelReport,
  buildExportRows,
  escapeCsv,
  getExportColumns,
  normalizeList
};
