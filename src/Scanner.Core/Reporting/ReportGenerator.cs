using System.Net;
using System.Text.Json;
using Scanner.Core.Runtime;

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
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new ArgumentException("Scan result path must be provided.", nameof(path));
        }

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Scan result not found: {path}");
        }

        var json = File.ReadAllText(path);
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new InvalidDataException($"Scan result {path} is invalid.");
        }

        ScanResult? scan;
        try
        {
            scan = JsonSerializer.Deserialize<ScanResult>(json, SerializerOptions);
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException($"Scan result {path} is invalid.", exception);
        }
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
    public ReportArtifacts WriteReport(ScanResult scan, string outputDirectory, string baseName, RuntimeScanResult? runtimeScan = null)
    {
        if (scan == null)
        {
            throw new ArgumentNullException(nameof(scan));
        }

        if (string.IsNullOrWhiteSpace(outputDirectory))
        {
            throw new ArgumentException("Output directory must be provided.", nameof(outputDirectory));
        }

        if (string.IsNullOrWhiteSpace(baseName))
        {
            throw new ArgumentException("Report base name must be provided.", nameof(baseName));
        }

        Directory.CreateDirectory(outputDirectory);
        var report = new ReportResult { Scan = scan, RuntimeScan = runtimeScan, GeneratedAt = DateTimeOffset.UtcNow };

        var sanitizedBaseName = SanitizeFileName(baseName);
        if (string.IsNullOrWhiteSpace(sanitizedBaseName))
        {
            sanitizedBaseName = "report";
        }

        var jsonPath = Path.Combine(outputDirectory, $"{sanitizedBaseName}.json");
        var htmlPath = Path.Combine(outputDirectory, $"{sanitizedBaseName}.html");
        var mdPath = Path.Combine(outputDirectory, $"{sanitizedBaseName}.md");

        File.WriteAllText(jsonPath, JsonSerializer.Serialize(report, SerializerOptions));
        File.WriteAllText(htmlPath, BuildHtml(report));
        File.WriteAllText(mdPath, BuildMarkdown(report));

        return new ReportArtifacts(jsonPath, htmlPath, mdPath);
    }

    private static string BuildHtml(ReportResult report)
    {
        var scanIssues = report.Scan.Issues ?? Array.Empty<Issue>();
        var scanFiles = report.Scan.Files ?? Array.Empty<DiscoveredFile>();
        var rows = scanIssues.Count == 0
            ? "<tr><td colspan=\"5\">No issues found.</td></tr>"
            : string.Join("", scanIssues.Select(issue =>
                $"<tr><td>{HtmlEncode(issue.RuleId)}</td><td>{HtmlEncode(issue.CheckId)}</td><td>{HtmlEncode(issue.FilePath)}</td><td>{issue.Line}</td><td>{HtmlEncode(issue.Message)}</td></tr>"));

        var runtimeIssues = report.RuntimeScan?.Issues ?? Array.Empty<Issue>();
        var runtimeRows = report.RuntimeScan == null
            ? string.Empty
            : runtimeIssues.Count == 0
                ? "<tr><td colspan=\"5\">No issues found.</td></tr>"
                : string.Join("", runtimeIssues.Select(issue =>
                    $"<tr><td>{HtmlEncode(issue.RuleId)}</td><td>{HtmlEncode(issue.CheckId)}</td><td>{HtmlEncode(issue.FilePath)}</td><td>{issue.Line}</td><td>{HtmlEncode(issue.Message)}</td></tr>"));

        var runtimeForms = report.RuntimeScan?.Forms ?? Array.Empty<RuntimeFormConfiguration>();
        var formRows = report.RuntimeScan == null
            ? string.Empty
            : string.Join("", runtimeForms.Select(form =>
                $"<tr><td>{HtmlEncode(form.Method)}</td><td>{HtmlEncode(form.Action)}</td><td>{form.Inputs.Count}</td><td>{(form.Enabled ? "Enabled" : "Disabled")}</td></tr>"));

        var scanSummaryRows = scanIssues.Count == 0
            ? "<tr><td colspan=\"2\">No issues found.</td></tr>"
            : string.Join("", scanIssues
                .GroupBy(issue => issue.RuleId)
                .OrderByDescending(group => group.Count())
                .ThenBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => $"<tr><td>{HtmlEncode(group.Key)}</td><td>{group.Count()}</td></tr>"));

        var runtimeSummaryRows = runtimeIssues.Count == 0
            ? "<tr><td colspan=\"2\">No issues found.</td></tr>"
            : string.Join("", runtimeIssues
                .GroupBy(issue => issue.RuleId)
                .OrderByDescending(group => group.Count())
                .ThenBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => $"<tr><td>{HtmlEncode(group.Key)}</td><td>{group.Count()}</td></tr>"));

        var runtimeSection = report.RuntimeScan == null
            ? string.Empty
            : $"""
  <h2>Runtime Scan</h2>
  <p>Seed URLs: {HtmlEncode(string.Join(", ", report.RuntimeScan.SeedUrls ?? Array.Empty<string>()))}</p>
  <p>Total runtime issues: {runtimeIssues.Count}</p>
  {(string.IsNullOrWhiteSpace(report.RuntimeScan.FormConfigurationPath) ? string.Empty : $"<p>Form config: {HtmlEncode(report.RuntimeScan.FormConfigurationPath)}</p>")}
  <h3>Runtime Issues by Rule</h3>
  <table border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th>Rule</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      {runtimeSummaryRows}
    </tbody>
  </table>
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
  {(runtimeForms.Count == 0 ? string.Empty : $"""
  <h3>Discovered Forms</h3>
  <table border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th>Method</th>
        <th>Action</th>
        <th>Inputs</th>
        <th>Auto-submit</th>
      </tr>
    </thead>
    <tbody>
      {formRows}
    </tbody>
  </table>
  """)}
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
  <p>Scanned: {HtmlEncode(report.Scan.ScannedPath)}</p>
  <p>Generated: {report.GeneratedAt:u}</p>
  <p>Files scanned: {scanFiles.Count}</p>
  <p>Total issues: {scanIssues.Count}</p>
  <h2>Issues by Rule</h2>
  <table border="1" cellspacing="0" cellpadding="6">
    <thead>
      <tr>
        <th>Rule</th>
        <th>Count</th>
      </tr>
    </thead>
    <tbody>
      {scanSummaryRows}
    </tbody>
  </table>
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
        var scanIssues = report.Scan.Issues ?? Array.Empty<Issue>();
        var scanFiles = report.Scan.Files ?? Array.Empty<DiscoveredFile>();
        var runtimeIssues = report.RuntimeScan?.Issues ?? Array.Empty<Issue>();
        var runtimeForms = report.RuntimeScan?.Forms ?? Array.Empty<RuntimeFormConfiguration>();
        var lines = new List<string>
        {
            "# ADA Scanner Report",
            $"Scanned: `{MarkdownEscape(report.Scan.ScannedPath)}`",
            $"Generated: {report.GeneratedAt:u}",
            $"Files scanned: {scanFiles.Count}",
            $"Total issues: {scanIssues.Count}",
            "",
            "## Issues by Rule",
            "",
            "| Rule | Count |",
            "| --- | --- |"
        };

        if (scanIssues.Count == 0)
        {
            lines.Add("| _None_ | 0 |");
        }
        else
        {
            lines.AddRange(scanIssues
                .GroupBy(issue => issue.RuleId)
                .OrderByDescending(group => group.Count())
                .ThenBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => $"| {MarkdownEscape(group.Key)} | {group.Count()} |"));
        }

        lines.AddRange(new[]
        {
            "",
            "| Rule | Check | File | Line | Message |",
            "| --- | --- | --- | --- | --- |"
        });

        if (scanIssues.Count == 0)
        {
            lines.Add("| _None_ | _None_ | _None_ | _None_ | No issues found. |");
        }
        else
        {
            lines.AddRange(scanIssues.Select(issue =>
                $"| {MarkdownEscape(issue.RuleId)} | {MarkdownEscape(issue.CheckId)} | {MarkdownEscape(issue.FilePath)} | {issue.Line} | {MarkdownEscape(issue.Message)} |"));
        }

        if (report.RuntimeScan != null)
        {
            lines.Add("");
            lines.Add("## Runtime Scan");
            lines.Add($"Seed URLs: {MarkdownEscape(string.Join(", ", report.RuntimeScan.SeedUrls ?? Array.Empty<string>()))}");
            lines.Add($"Total runtime issues: {runtimeIssues.Count}");
            if (!string.IsNullOrWhiteSpace(report.RuntimeScan.FormConfigurationPath))
            {
                lines.Add($"Form config: `{MarkdownEscape(report.RuntimeScan.FormConfigurationPath)}`");
            }
            lines.Add("");
            lines.Add("### Runtime Issues by Rule");
            lines.Add("");
            lines.Add("| Rule | Count |");
            lines.Add("| --- | --- |");
            if (runtimeIssues.Count == 0)
            {
                lines.Add("| _None_ | 0 |");
            }
            else
            {
                lines.AddRange(runtimeIssues
                    .GroupBy(issue => issue.RuleId)
                    .OrderByDescending(group => group.Count())
                    .ThenBy(group => group.Key, StringComparer.Ordinal)
                    .Select(group => $"| {MarkdownEscape(group.Key)} | {group.Count()} |"));
            }
            lines.Add("");
            lines.Add("| Rule | Check | URL | Line | Message |");
            lines.Add("| --- | --- | --- | --- | --- |");
            if (runtimeIssues.Count == 0)
            {
                lines.Add("| _None_ | _None_ | _None_ | _None_ | No issues found. |");
            }
            else
            {
                lines.AddRange(runtimeIssues.Select(issue =>
                    $"| {MarkdownEscape(issue.RuleId)} | {MarkdownEscape(issue.CheckId)} | {MarkdownEscape(issue.FilePath)} | {issue.Line} | {MarkdownEscape(issue.Message)} |"));
            }

            if (runtimeForms.Count > 0)
            {
                lines.Add("");
                lines.Add("### Discovered Forms");
                lines.Add("");
                lines.Add("| Method | Action | Inputs | Auto-submit |");
                lines.Add("| --- | --- | --- | --- |");
                lines.AddRange(runtimeForms.Select(form =>
                    $"| {MarkdownEscape(form.Method)} | {MarkdownEscape(form.Action)} | {form.Inputs.Count} | {(form.Enabled ? "Enabled" : "Disabled")} |"));
            }
        }

        return string.Join(Environment.NewLine, lines);
    }

    private static string HtmlEncode(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    private static string MarkdownEscape(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var encoded = WebUtility.HtmlEncode(value);
        return encoded.Replace("|", "\\|", StringComparison.Ordinal)
            .Replace("\r", string.Empty, StringComparison.Ordinal)
            .Replace("\n", "<br />", StringComparison.Ordinal);
    }

    private static string SanitizeFileName(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new char[value.Length];
        for (var i = 0; i < value.Length; i++)
        {
            var current = value[i];
            sanitized[i] = invalidChars.Contains(current) ? '_' : current;
        }

        return new string(sanitized).Trim();
    }
}

/// <summary>
/// Identifies the output artifacts generated by the report writer.
/// </summary>
/// <param name="JsonPath">Path to the JSON report.</param>
/// <param name="HtmlPath">Path to the HTML report.</param>
/// <param name="MarkdownPath">Path to the Markdown report.</param>
public sealed record ReportArtifacts(string JsonPath, string HtmlPath, string MarkdownPath);
