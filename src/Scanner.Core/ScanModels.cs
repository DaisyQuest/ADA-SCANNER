using System.Text.Json.Serialization;

namespace Scanner.Core;

public sealed record DiscoveredFile(string Path, string Kind);

public sealed record Issue(
    string RuleId,
    string CheckId,
    string FilePath,
    int Line,
    string Message,
    string? Evidence);

public sealed class ScanResult
{
    public string ScannedPath { get; init; } = string.Empty;
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
    public IReadOnlyList<DiscoveredFile> Files { get; init; } = Array.Empty<DiscoveredFile>();
    public IReadOnlyList<Issue> Issues { get; init; } = Array.Empty<Issue>();
}

public sealed class ReportResult
{
    [JsonPropertyName("scan")]
    public ScanResult Scan { get; init; } = new();
    [JsonPropertyName("generatedAt")]
    public DateTimeOffset GeneratedAt { get; init; } = DateTimeOffset.UtcNow;
}
