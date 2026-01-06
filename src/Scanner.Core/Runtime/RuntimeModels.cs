using Scanner.Core;

namespace Scanner.Core.Runtime;

/// <summary>
/// Represents a captured HTML document from a runtime scan.
/// </summary>
/// <param name="Url">The absolute URL of the document.</param>
/// <param name="StatusCode">The HTTP status code returned by the server.</param>
/// <param name="ContentType">The response content type.</param>
/// <param name="Body">The captured HTML body.</param>
/// <param name="CapturedAt">The timestamp when the response was captured.</param>
public sealed record RuntimeHtmlDocument(
    string Url,
    int StatusCode,
    string? ContentType,
    string Body,
    DateTimeOffset CapturedAt);

/// <summary>
/// Captures the results of a runtime scan.
/// </summary>
public sealed class RuntimeScanResult
{
    /// <summary>
    /// Gets the seed URLs used to start the scan.
    /// </summary>
    public IReadOnlyList<string> SeedUrls { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the timestamp when the scan was executed.
    /// </summary>
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Gets the documents captured during runtime scanning.
    /// </summary>
    public IReadOnlyList<RuntimeHtmlDocument> Documents { get; init; } = Array.Empty<RuntimeHtmlDocument>();

    /// <summary>
    /// Gets the list of issues found during runtime scanning.
    /// </summary>
    public IReadOnlyList<Issue> Issues { get; init; } = Array.Empty<Issue>();
}
