using System.Text.Json.Serialization;

namespace Scanner.Core;

/// <summary>
/// Represents a file discovered for scanning along with its UI kind.
/// </summary>
/// <param name="Path">The full path to the file.</param>
/// <param name="Kind">The UI file kind (e.g., html, xaml).</param>
public sealed record DiscoveredFile(string Path, string Kind);

/// <summary>
/// Describes a rule violation found during scanning.
/// </summary>
/// <param name="RuleId">The rule identifier that produced the issue.</param>
/// <param name="CheckId">The check identifier that produced the issue.</param>
/// <param name="FilePath">The file path where the issue was found.</param>
/// <param name="Line">The 1-based line number within the file.</param>
/// <param name="Message">The human-readable issue message.</param>
/// <param name="Evidence">Optional evidence snippet from the source.</param>
public sealed record Issue(
    string RuleId,
    string CheckId,
    string FilePath,
    int Line,
    string Message,
    string? Evidence);

/// <summary>
/// Captures the results of a scan, including files and issues.
/// </summary>
public sealed class ScanResult
{
    /// <summary>
    /// Gets the normalized path that was scanned.
    /// </summary>
    public string ScannedPath { get; init; } = string.Empty;

    /// <summary>
    /// Gets the timestamp when the scan was executed.
    /// </summary>
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Gets the files that were evaluated by the scan.
    /// </summary>
    public IReadOnlyList<DiscoveredFile> Files { get; init; } = Array.Empty<DiscoveredFile>();

    /// <summary>
    /// Gets the list of issues found during scanning.
    /// </summary>
    public IReadOnlyList<Issue> Issues { get; init; } = Array.Empty<Issue>();
}

/// <summary>
/// Wraps a scan result for reporting output.
/// </summary>
public sealed class ReportResult
{
    /// <summary>
    /// Gets the scan payload to include in the report.
    /// </summary>
    [JsonPropertyName("scan")]
    public ScanResult Scan { get; init; } = new();

    /// <summary>
    /// Gets the timestamp when the report was generated.
    /// </summary>
    [JsonPropertyName("generatedAt")]
    public DateTimeOffset GeneratedAt { get; init; } = DateTimeOffset.UtcNow;
}
