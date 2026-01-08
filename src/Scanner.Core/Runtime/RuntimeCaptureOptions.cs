namespace Scanner.Core.Runtime;

/// <summary>
/// Configures the runtime capture listener for browser-posted HTML.
/// </summary>
public sealed class RuntimeCaptureOptions
{
    /// <summary>
    /// Gets the port used by the capture listener.
    /// </summary>
    public int Port { get; init; }

    /// <summary>
    /// Gets the host name used by the capture listener.
    /// </summary>
    public string Host { get; init; } = "127.0.0.1";

    /// <summary>
    /// Gets the path that accepts capture requests.
    /// </summary>
    public string Path { get; init; } = "/capture";

    /// <summary>
    /// Gets the maximum number of documents to capture before the listener stops.
    /// </summary>
    public int MaxDocuments { get; init; } = 1;

    /// <summary>
    /// Gets the idle timeout for waiting on capture requests.
    /// </summary>
    public TimeSpan IdleTimeout { get; init; } = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Gets the optional token required to post capture payloads.
    /// </summary>
    public string? AccessToken { get; init; }

    /// <summary>
    /// Gets the optional logger for verbose capture output.
    /// </summary>
    public Action<string>? Log { get; set; }
}
