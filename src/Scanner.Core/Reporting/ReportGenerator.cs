using System.Text.Json;

namespace Scanner.Core.Reporting;

/// <summary>
/// Generates JSON, HTML, and Markdown reports from scan results.
/// </summary>
public sealed class ReportGenerator
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    /// <summary>
    /// Loads a scan result from a JSON file.
    /// </summary>
    /// <param name="path">The path to the scan JSON file.</param>
    /// <returns>The deserialized scan result.</returns>
    /// <exception cref="FileNotFoundException">Thrown when the scan file does not exist.</exception>
    /// <exception cref="InvalidDataException">Thrown when the scan file cannot be parsed.</exception>
    public ScanResult LoadScanResult(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Scan result not found: {path}");
        }

        var json = File.ReadAllText(path);
        var scan = JsonSerializer.Deserialize<ScanResult>(json, SerializerOptions);
        if (scan == null)
        {
            throw new InvalidDataException($"Scan result {path} is invalid.");
        }

        return scan;
    }

    /// <summary>
    /// Writes report artifacts for the provided scan result.
    /// </summary>
    /// <param name="scan">The scan result to serialize into report formats.</param>
    /// <param name="runtimeScan">The optional runtime scan result to include.</param>
    /// <param name="outputDirectory">The directory to write artifacts into.</param>
    /// <param name="baseName">The base filename for report artifacts.</param>
    /// <returns>The paths to the generated report artifacts.</returns>
    public ReportArtifacts WriteReport(ScanResult scan, string outputDirectory, string baseName, Runtime.RuntimeScanResult? runtimeScan = null)
    {
        Directory.CreateDirectory(outputDirectory);
        var report = new ReportResult { Scan = scan, RuntimeScan = runtimeScan, GeneratedAt = DateTimeOffset.UtcNow };

        var jsonPath = Path.Combine(outputDirectory, $"{baseName}.json");
        var htmlPath = Path.Combine(outputDirectory, $"{baseName}.html");
        var mdPath = Path.Combine(outputDirectory, $"{baseName}.md");

        File.WriteAllText(jsonPath, JsonSerializer.Serialize(report, SerializerOptions));
        File.WriteAllText(htmlPath, BuildHtml(report));
        File.WriteAllText(mdPath, BuildMarkdown(report));

        return new ReportArtifacts(jsonPath, htmlPath, mdPath);
    }

    private static string BuildHtml(ReportResult report)
    {
        var rows = string.Join("", report.Scan.Issues.Select(issue =>
            $"<tr><td>{issue.RuleId}</td><td>{issue.CheckId}</td><td>{issue.FilePath}</td><td>{issue.Line}</td><td>{issue.Message}</td></tr>"));

        var runtimeRows = report.RuntimeScan == null
            ? string.Empty
            : string.Join("", report.RuntimeScan.Issues.Select(issue =>
                $"<tr><td>{issue.RuleId}</td><td>{issue.CheckId}</td><td>{issue.FilePath}</td><td>{issue.Line}</td><td>{issue.Message}</td></tr>"));

        var runtimeSection = report.RuntimeScan == null
            ? string.Empty
            : $"""
  <h2>Runtime Scan</h2>
  <p>Seed URLs: {string.Join(", ", report.RuntimeScan.SeedUrls)}</p>
  <table border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th>Rule</th>
        <th>Check</th>
        <th>URL</th>
        <th>Line</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      {runtimeRows}
    </tbody>
  </table>
""";

        return $"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>ADA Scanner Report</title>
</head>
<body>
  <h1>ADA Scanner Report</h1>
  <p>Scanned: {report.Scan.ScannedPath}</p>
  <p>Generated: {report.GeneratedAt:u}</p>
  <table border=\"1\" cellspacing=\"0\" cellpadding=\"6\">
    <thead>
      <tr>
        <th>Rule</th>
        <th>Check</th>
        <th>File</th>
        <th>Line</th>
        <th>Message</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
  {runtimeSection}
</body>
</html>
""";
    }

    private static string BuildMarkdown(ReportResult report)
    {
        var lines = new List<string>
        {
            "# ADA Scanner Report",
            $"Scanned: `{report.Scan.ScannedPath}`",
            $"Generated: {report.GeneratedAt:u}",
            "",
            "| Rule | Check | File | Line | Message |",
            "| --- | --- | --- | --- | --- |"
        };

        lines.AddRange(report.Scan.Issues.Select(issue =>
            $"| {issue.RuleId} | {issue.CheckId} | {issue.FilePath} | {issue.Line} | {issue.Message} |"));

        if (report.RuntimeScan != null)
        {
            lines.Add("");
            lines.Add("## Runtime Scan");
            lines.Add($"Seed URLs: {string.Join(", ", report.RuntimeScan.SeedUrls)}");
            lines.Add("");
            lines.Add("| Rule | Check | URL | Line | Message |");
            lines.Add("| --- | --- | --- | --- | --- |");
            lines.AddRange(report.RuntimeScan.Issues.Select(issue =>
                $"| {issue.RuleId} | {issue.CheckId} | {issue.FilePath} | {issue.Line} | {issue.Message} |"));
        }

        return string.Join(Environment.NewLine, lines);
    }
}

/// <summary>
/// Identifies the output artifacts generated by the report writer.
/// </summary>
/// <param name="JsonPath">Path to the JSON report.</param>
/// <param name="HtmlPath">Path to the HTML report.</param>
/// <param name="MarkdownPath">Path to the Markdown report.</param>
public sealed record ReportArtifacts(string JsonPath, string HtmlPath, string MarkdownPath);
