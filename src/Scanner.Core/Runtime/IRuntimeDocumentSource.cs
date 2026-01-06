namespace Scanner.Core.Runtime;

/// <summary>
/// Defines a source for runtime HTML documents.
/// </summary>
public interface IRuntimeDocumentSource
{
    /// <summary>
    /// Streams HTML documents for the provided runtime scan options.
    /// </summary>
    /// <param name="options">The runtime scan options.</param>
    /// <param name="cancellationToken">Token used to cancel the stream.</param>
    /// <returns>An async stream of runtime HTML documents.</returns>
    IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
        RuntimeScanOptions options,
        CancellationToken cancellationToken = default);
}
