using System.Text.Json;

namespace Scanner.Core.Reporting;

public sealed class ReportGenerator
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

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

    public ReportArtifacts WriteReport(ScanResult scan, string outputDirectory, string baseName)
    {
        Directory.CreateDirectory(outputDirectory);
        var report = new ReportResult { Scan = scan, GeneratedAt = DateTimeOffset.UtcNow };

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

        return string.Join(Environment.NewLine, lines);
    }
}

public sealed record ReportArtifacts(string JsonPath, string HtmlPath, string MarkdownPath);
