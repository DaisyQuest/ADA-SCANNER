using System.Threading.Channels;
using Scanner.Core.Runtime;

namespace Scanner.Runtime.AspNetCore;

/// <summary>
/// Provides a bounded channel for runtime HTML document capture.
/// </summary>
public sealed class ResponseCaptureChannel
{
    private readonly Channel<RuntimeHtmlDocument> _channel;

    /// <summary>
    /// Initializes a new instance of the <see cref="ResponseCaptureChannel"/> class.
    /// </summary>
    /// <param name="options">The response capture configuration.</param>
    public ResponseCaptureChannel(ResponseCaptureOptions options)
    {
        var capacity = options.ChannelCapacity <= 0 ? 1 : options.ChannelCapacity;
        _channel = Channel.CreateBounded<RuntimeHtmlDocument>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    /// <summary>
    /// Gets the channel reader.
    /// </summary>
    public ChannelReader<RuntimeHtmlDocument> Reader => _channel.Reader;

    /// <summary>
    /// Enqueues a captured document for processing.
    /// </summary>
    /// <param name="document">The captured document.</param>
    /// <param name="cancellationToken">Token used to cancel the enqueue.</param>
    public ValueTask EnqueueAsync(RuntimeHtmlDocument document, CancellationToken cancellationToken = default)
    {
        return _channel.Writer.WriteAsync(document, cancellationToken);
    }
}
