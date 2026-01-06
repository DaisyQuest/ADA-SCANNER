using System.Net;
using System.Text;
using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeCrawlerTests
{
    [Fact]
    public async Task Crawler_InjectsAuthHeaders()
    {
        var handler = new RecordingHandler(_ => HtmlResponse("<html></html>"));
        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/") },
            AuthHeaders = new Dictionary<string, string> { ["Authorization"] = "Bearer token" }
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Single(documents);
        Assert.Single(handler.Requests);
        Assert.Equal("Bearer token", handler.Requests[0].Headers.GetValues("Authorization").Single());
    }

    [Fact]
    public async Task Crawler_RespectsIncludeExcludePatterns()
    {
        var handler = new RecordingHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath == "/skip")
            {
                return HtmlResponse("<html>skip</html>");
            }

            return HtmlResponse("<a href=\"/allowed\">Allowed</a><a href=\"/skip\">Skip</a>");
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            IncludeUrlPatterns = new[] { "example\\.test" },
            ExcludeUrlPatterns = new[] { "skip" },
            MaxPages = 3
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Equal(2, handler.Requests.Count);
        Assert.DoesNotContain(handler.Requests, request => request.RequestUri!.AbsolutePath == "/skip");
        Assert.Equal(2, documents.Count);
    }

    [Fact]
    public async Task Crawler_RespectsMaxPages()
    {
        var handler = new RecordingHandler(_ =>
            HtmlResponse("<a href=\"/one\">One</a><a href=\"/two\">Two</a>"));
        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            MaxPages = 1
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Single(handler.Requests);
        Assert.Single(documents);
    }

    [Fact]
    public async Task Crawler_RespectsMaxDepth()
    {
        var handler = new RecordingHandler(request =>
        {
            return request.RequestUri!.AbsolutePath switch
            {
                "/index" => HtmlResponse("<a href=\"/level1\">Level1</a>"),
                "/level1" => HtmlResponse("<a href=\"/level2\">Level2</a>"),
                _ => HtmlResponse("<html></html>")
            };
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            MaxDepth = 1,
            MaxPages = 3
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Equal(2, handler.Requests.Count);
        Assert.DoesNotContain(handler.Requests, request => request.RequestUri!.AbsolutePath == "/level2");
        Assert.Equal(2, documents.Count);
    }

    [Fact]
    public async Task Crawler_RespectsBodySizeCap()
    {
        var handler = new RecordingHandler(_ => HtmlResponse(new string('x', 20)));
        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            MaxBodyBytes = 5
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Single(documents);
        Assert.True(documents[0].Body.Length <= 5);
    }

    [Fact]
    public async Task Crawler_FiltersByAllowedContentTypes()
    {
        var handler = new RecordingHandler(request =>
        {
            return request.RequestUri!.AbsolutePath switch
            {
                "/xhtml" => new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("<html></html>", Encoding.UTF8, "application/xhtml+xml")
                },
                _ => HtmlResponse("<html></html>")
            };
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[]
            {
                new Uri("http://example.test/html"),
                new Uri("http://example.test/xhtml")
            },
            AllowedContentTypes = new[] { "application/xhtml+xml" }
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Equal(2, handler.Requests.Count);
        Assert.Single(documents);
        Assert.Equal("application/xhtml+xml", documents[0].ContentType);
    }

    [Fact]
    public async Task Crawler_ExcludesContentTypes()
    {
        var handler = new RecordingHandler(_ => HtmlResponse("<html></html>"));
        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/html") },
            ExcludedContentTypes = new[] { "text/html" }
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Single(handler.Requests);
        Assert.Empty(documents);
    }

    [Fact]
    public async Task Crawler_FiltersByStatusCodes()
    {
        var handler = new RecordingHandler(request =>
        {
            return request.RequestUri!.AbsolutePath switch
            {
                "/ok" => HtmlResponse("<html></html>"),
                _ => new HttpResponseMessage(HttpStatusCode.NotFound)
                {
                    Content = new StringContent("<html></html>", Encoding.UTF8, "text/html")
                }
            };
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[]
            {
                new Uri("http://example.test/ok"),
                new Uri("http://example.test/missing")
            },
            AllowedStatusCodes = new[] { 200 }
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Equal(2, handler.Requests.Count);
        Assert.Single(documents);
        Assert.Equal(200, documents[0].StatusCode);
    }

    [Fact]
    public async Task Crawler_ExcludesStatusCodes()
    {
        var handler = new RecordingHandler(request =>
        {
            return request.RequestUri!.AbsolutePath switch
            {
                "/blocked" => new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("<html></html>", Encoding.UTF8, "text/html")
                },
                _ => HtmlResponse("<html></html>")
            };
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[]
            {
                new Uri("http://example.test/allowed"),
                new Uri("http://example.test/blocked")
            },
            ExcludedStatusCodes = new[] { 403 }
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Equal(2, handler.Requests.Count);
        Assert.Single(documents);
        Assert.Equal(200, documents[0].StatusCode);
    }

    [Fact]
    public async Task Crawler_RespectsSampleRate()
    {
        var handler = new RecordingHandler(_ => HtmlResponse("<html></html>"));
        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            SampleRate = 0,
            Random = new Random(42)
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Empty(documents);
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task Crawler_HandlesRequestErrors()
    {
        var handler = new RecordingHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath == "/fail")
            {
                throw new HttpRequestException("boom");
            }

            return HtmlResponse("<a href=\"/fail\">Fail</a>");
        });

        var client = new HttpClient(handler);
        var crawler = new HttpRuntimeCrawler(client);

        var options = new RuntimeScanOptions
        {
            SeedUrls = new[] { new Uri("http://example.test/index") },
            MaxPages = 2
        };

        var documents = await CollectAsync(crawler, options);

        Assert.Single(documents);
        Assert.Equal(2, handler.Requests.Count);
    }

    private static async Task<List<RuntimeHtmlDocument>> CollectAsync(
        IRuntimeDocumentSource source,
        RuntimeScanOptions options)
    {
        var results = new List<RuntimeHtmlDocument>();
        await foreach (var document in source.GetDocumentsAsync(options))
        {
            results.Add(document);
        }

        return results;
    }

    private static HttpResponseMessage HtmlResponse(string html)
    {
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(html, Encoding.UTF8, "text/html")
        };
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _handler;

        public RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> handler)
        {
            _handler = handler;
        }

        public List<HttpRequestMessage> Requests { get; } = new();

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return Task.FromResult(_handler(request));
        }
    }
}
