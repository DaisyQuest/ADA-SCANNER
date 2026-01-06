using System.Threading.Channels;
using Scanner.Core.Runtime;

namespace Scanner.Runtime.AspNetCore;

/// <summary>
/// Processes captured runtime HTML documents from a channel.
/// </summary>
public sealed class ResponseCaptureProcessor
{
    private readonly ChannelReader<RuntimeHtmlDocument> _reader;

    /// <summary>
    /// Initializes a new instance of the <see cref="ResponseCaptureProcessor"/> class.
    /// </summary>
    /// <param name="reader">The channel reader providing documents.</param>
    public ResponseCaptureProcessor(ChannelReader<RuntimeHtmlDocument> reader)
    {
        _reader = reader;
    }

    /// <summary>
    /// Processes incoming documents until the channel completes.
    /// </summary>
    /// <param name="handler">The handler invoked for each document.</param>
    /// <param name="cancellationToken">Token used to cancel processing.</param>
    public async Task RunAsync(
        Func<RuntimeHtmlDocument, CancellationToken, Task> handler,
        CancellationToken cancellationToken = default)
    {
        await foreach (var document in _reader.ReadAllAsync(cancellationToken))
        {
            await handler(document, cancellationToken).ConfigureAwait(false);
        }
    }
}
