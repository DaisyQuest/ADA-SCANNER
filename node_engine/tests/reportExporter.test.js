const ExcelJS = require("exceljs");
const {
  buildCsvReport,
  buildExcelReport,
  buildExportRows,
  escapeCsv,
  getExportColumns,
  normalizeList
} = require("../src/listener/ReportExporter");

describe("ReportExporter", () => {
  const issues = [
    {
      ruleId: "rule-1",
      ruleDescription: "Missing label",
      severity: "high",
      teamName: "team-a",
      filePath: "file-a.html",
      line: 12,
      message: "Add label",
      checkId: "missing-label",
      recommendation: "Use aria-label",
      wcagCriteria: ["1.1.1"],
      problemTags: ["forms", "labels"],
      algorithm: "Verify labels",
      algorithmAdvanced: "Audit each input"
    }
  ];

  test("normalizes list fields", () => {
    expect(normalizeList(["a", "b"])).toBe("a, b");
    expect(normalizeList("value")).toBe("value");
    expect(normalizeList(null)).toBe("");
  });

  test("builds export rows with algorithm data", () => {
    const rows = buildExportRows({ issues });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      ruleId: "rule-1",
      algorithm: "Verify labels",
      algorithmAdvanced: "Audit each input",
      problemTags: "forms, labels"
    });
  });

  test("defaults blank values when issue fields are missing", () => {
    const rows = buildExportRows({ issues: [{}] });
    expect(rows[0]).toMatchObject({
      ruleId: "",
      ruleDescription: "",
      severity: "",
      teamName: "",
      filePath: "",
      line: "",
      message: "",
      checkId: "",
      recommendation: "",
      wcagCriteria: "",
      problemTags: "",
      algorithm: "",
      algorithmAdvanced: ""
    });
  });

  test("builds csv exports for full and thin variants", () => {
    const fullCsv = buildCsvReport({ issues, includeAlgorithm: true });
    const thinCsv = buildCsvReport({ issues, includeAlgorithm: false });
    expect(fullCsv).toContain("Algorithm");
    expect(fullCsv).toContain("Audit each input");
    expect(thinCsv).not.toContain("Algorithm");
  });

  test("builds csv exports with escaping and empty payloads", () => {
    const csvWithQuotes = buildCsvReport({
      issues: [
        {
          ...issues[0],
          message: "Needs \"quotes\" and\nnewline"
        }
      ],
      includeAlgorithm: true
    });
    const emptyCsv = buildCsvReport({ issues: [], includeAlgorithm: false });
    expect(csvWithQuotes).toContain("\"Needs \"\"quotes\"\" and\nnewline\"");
    expect(emptyCsv.trim()).toBe("Rule ID,Rule Description,Severity,Team,File,Line,Message,Check ID,Recommendation,WCAG Criteria,Problem Tags");
  });

  test("escapes nullish values safely", () => {
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv("plain")).toBe("plain");
  });

  test("supports default arguments for report builders", async () => {
    expect(buildExportRows()).toEqual([]);
    expect(buildCsvReport()).toContain("Rule ID");
    const buffer = await buildExcelReport();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet("Issues")).toBeTruthy();
  });

  test("builds excel exports with styled headers", async () => {
    const buffer = await buildExcelReport({
      issues: [
        ...issues,
        { ...issues[0], ruleId: "rule-2", line: 30 },
        { ...issues[0], ruleId: "rule-3", line: 42 }
      ],
      includeAlgorithm: true
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Issues");
    const headerRow = worksheet.getRow(1);

    expect(headerRow.getCell(1).value).toBe("Rule ID");
    expect(headerRow.getCell(headerRow.cellCount).value).toBe("Algorithm (Advanced)");
    expect(headerRow.getCell(1).font.bold).toBe(true);
    expect(headerRow.getCell(1).fill.fgColor.argb).toBe("FFE2E8F0");
    expect(worksheet.getRow(2).getCell(1).fill.fgColor.argb).toBe("FFF8FAFC");
    expect(worksheet.getRow(3).getCell(1).fill.fgColor).toBeUndefined();
  });

  test("omits algorithm columns in thin excel exports", async () => {
    const buffer = await buildExcelReport({ issues, includeAlgorithm: false });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet("Issues");
    const headers = worksheet.getRow(1).values;
    expect(headers).not.toContain("Algorithm");
    expect(headers).not.toContain("Algorithm (Advanced)");
    expect(getExportColumns(false).some((column) => column.key === "algorithm")).toBe(false);
  });
});
