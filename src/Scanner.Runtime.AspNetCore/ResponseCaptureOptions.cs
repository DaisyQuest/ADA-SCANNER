namespace Scanner.Runtime.AspNetCore;

/// <summary>
/// Configures response capture behavior for runtime scanning.
/// </summary>
public sealed class ResponseCaptureOptions
{
    /// <summary>
    /// Gets the maximum number of response bytes to capture per response.
    /// </summary>
    public int MaxBodyBytes { get; init; } = 1024 * 1024;

    /// <summary>
    /// Gets the maximum number of documents buffered in the channel.
    /// </summary>
    public int ChannelCapacity { get; init; } = 100;
}
