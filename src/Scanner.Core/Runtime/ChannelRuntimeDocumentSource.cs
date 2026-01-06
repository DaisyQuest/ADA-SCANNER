using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace Scanner.Core.Runtime;

/// <summary>
/// Adapts a channel reader into a runtime document source.
/// </summary>
public sealed class ChannelRuntimeDocumentSource : IRuntimeDocumentSource
{
    private readonly ChannelReader<RuntimeHtmlDocument> _reader;

    /// <summary>
    /// Initializes a new instance of the <see cref="ChannelRuntimeDocumentSource"/> class.
    /// </summary>
    /// <param name="reader">The channel reader providing runtime documents.</param>
    public ChannelRuntimeDocumentSource(ChannelReader<RuntimeHtmlDocument> reader)
    {
        _reader = reader;
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
        RuntimeScanOptions options,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        while (await _reader.WaitToReadAsync(cancellationToken).ConfigureAwait(false))
        {
            while (_reader.TryRead(out var document))
            {
                cancellationToken.ThrowIfCancellationRequested();
                yield return document;
            }
        }
    }
}
