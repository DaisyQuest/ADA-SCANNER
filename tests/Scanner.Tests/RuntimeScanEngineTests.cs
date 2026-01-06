using System.Runtime.CompilerServices;
using Scanner.Core.Checks;
using Scanner.Core.Runtime;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeScanEngineTests
{
    [Fact]
    public async Task RuntimeScanEngine_AppliesRulesToDocuments()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var documentSource = new StubDocumentSource(new[]
        {
            new RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<img src=\"hero.png\">", DateTimeOffset.UtcNow)
        });

        var engine = new RuntimeScanEngine(documentSource, new RuleLoader(), CheckRegistry.Default());
        var result = await engine.ScanAsync(new RuntimeScanOptions
        {
            RulesRoot = Path.Combine(root, "rules"),
            SeedUrls = new[] { new Uri("http://example.test/page") }
        });

        Assert.Single(result.Issues);
        Assert.Equal("http://example.test/page", result.Issues[0].FilePath);
    }

    [Fact]
    public async Task RuntimeScanEngine_DedupesDocumentsAndIssues()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var document = new RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<img src=\"hero.png\">", DateTimeOffset.UtcNow);
        var documentSource = new StubDocumentSource(new[] { document, document });

        var engine = new RuntimeScanEngine(documentSource, new RuleLoader(), CheckRegistry.Default());
        var result = await engine.ScanAsync(new RuntimeScanOptions
        {
            RulesRoot = Path.Combine(root, "rules"),
            SeedUrls = new[] { new Uri("http://example.test/page") }
        });

        Assert.Single(result.Documents);
        Assert.Single(result.Issues);
    }

    [Fact]
    public async Task RuntimeScanEngine_ObservesCancellation()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var documentSource = new CancelingDocumentSource();
        var engine = new RuntimeScanEngine(documentSource, new RuleLoader(), CheckRegistry.Default());

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAsync<OperationCanceledException>(() => engine.ScanAsync(new RuntimeScanOptions
        {
            RulesRoot = Path.Combine(root, "rules"),
            SeedUrls = new[] { new Uri("http://example.test/page") }
        }, cts.Token));
    }

    private sealed class StubDocumentSource : IRuntimeDocumentSource
    {
        private readonly IReadOnlyList<RuntimeHtmlDocument> _documents;

        public StubDocumentSource(IReadOnlyList<RuntimeHtmlDocument> documents)
        {
            _documents = documents;
        }

        public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
            RuntimeScanOptions options,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            foreach (var document in _documents)
            {
                cancellationToken.ThrowIfCancellationRequested();
                yield return document;
                await Task.Yield();
            }
        }
    }

    private sealed class CancelingDocumentSource : IRuntimeDocumentSource
    {
        public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
            RuntimeScanOptions options,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                yield return new RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<img src=\"hero.png\">", DateTimeOffset.UtcNow);
                await Task.Delay(25, cancellationToken);
            }
        }
    }
}
