namespace Scanner.Core.Runtime;

/// <summary>
/// Configures a runtime scan, including crawler and rules settings.
/// </summary>
public sealed class RuntimeScanOptions
{
    /// <summary>
    /// Gets the root directory containing rule definitions.
    /// </summary>
    public string RulesRoot { get; set; } = string.Empty;

    /// <summary>
    /// Gets the seed URLs used to start crawling.
    /// </summary>
    public IReadOnlyList<Uri> SeedUrls { get; init; } = Array.Empty<Uri>();

    /// <summary>
    /// Gets the header values injected into HTTP requests for authentication.
    /// </summary>
    public IReadOnlyDictionary<string, string> AuthHeaders { get; init; } = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gets regex patterns that must match for a URL to be included.
    /// </summary>
    public IReadOnlyList<string> IncludeUrlPatterns { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets regex patterns that exclude URLs from being crawled.
    /// </summary>
    public IReadOnlyList<string> ExcludeUrlPatterns { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the maximum depth to follow links from the seed URLs.
    /// </summary>
    public int MaxDepth { get; init; } = int.MaxValue;

    /// <summary>
    /// Gets the maximum number of pages to crawl.
    /// </summary>
    public int MaxPages { get; init; } = 50;

    /// <summary>
    /// Gets the HTTP status codes that should be captured. Empty means all statuses.
    /// </summary>
    public IReadOnlyList<int> AllowedStatusCodes { get; init; } = Array.Empty<int>();

    /// <summary>
    /// Gets the HTTP status codes that should be excluded from capture.
    /// </summary>
    public IReadOnlyList<int> ExcludedStatusCodes { get; init; } = Array.Empty<int>();

    /// <summary>
    /// Gets the content types that should be captured. Empty defaults to text/html.
    /// </summary>
    public IReadOnlyList<string> AllowedContentTypes { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the content types that should be excluded from capture.
    /// </summary>
    public IReadOnlyList<string> ExcludedContentTypes { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the maximum number of body bytes to capture for each page.
    /// </summary>
    public int MaxBodyBytes { get; init; } = 1024 * 1024;

    /// <summary>
    /// Gets the sample rate for captured documents (0 to 1).
    /// </summary>
    public double SampleRate { get; init; } = 1.0;

    /// <summary>
    /// Gets the random source used for sampling.
    /// </summary>
    public Random Random { get; init; } = Random.Shared;

    /// <summary>
    /// Gets the optional path for the runtime form configuration file.
    /// </summary>
    public string? FormConfigPath { get; init; }

    /// <summary>
    /// Gets the optional form configuration store used for auto-submission.
    /// </summary>
    public RuntimeFormConfigurationStore? FormConfigurationStore { get; init; }
}
