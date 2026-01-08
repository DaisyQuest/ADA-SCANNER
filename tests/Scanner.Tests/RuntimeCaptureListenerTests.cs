using System.Net;
using System.Text;
using System.Text.Json;
using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeCaptureListenerTests
{
    [Fact]
    public async Task CaptureListener_NoCaptureOptions_YieldsNoDocuments()
    {
        var listener = new RuntimeCaptureListener();
        var options = new RuntimeScanOptions
        {
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var documents = new List<RuntimeHtmlDocument>();
        await foreach (var document in listener.GetDocumentsAsync(options))
        {
            documents.Add(document);
        }

        Assert.Empty(documents);
    }

    [Fact]
    public async Task CaptureListener_AcceptsDocument()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromSeconds(1)
            },
            MaxBodyBytes = 10,
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new
        {
            url = "http://example.test/page",
            html = "0123456789ABCDEF",
            contentType = "text/html",
            statusCode = 200
        };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hasDocument = await moveTask;

        Assert.True(hasDocument);
        Assert.Equal("http://example.test/page", enumerator.Current.Url);
        Assert.Equal(200, enumerator.Current.StatusCode);
        Assert.Equal("text/html", enumerator.Current.ContentType);
        Assert.Equal("0123456789", enumerator.Current.Body);
    }

    [Fact]
    public async Task CaptureListener_LogsLifecycleMessages()
    {
        var port = TestUtilities.GetAvailablePort();
        var messages = new List<string>();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromSeconds(1),
                Log = messages.Add
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(await moveTask);
        Assert.False(await enumerator.MoveNextAsync());

        Assert.Contains(messages, message => message.Contains("listener started", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(messages, message => message.Contains("request received", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(messages, message => message.Contains("capture accepted", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(messages, message => message.Contains("listener stopped", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CaptureListener_EmitsEmptyBodyWhenMaxBytesZero()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromSeconds(1)
            },
            MaxBodyBytes = 0,
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var hasDocument = await moveTask;

        Assert.True(hasDocument);
        Assert.Equal(string.Empty, enumerator.Current.Body);
    }

    [Fact]
    public async Task CaptureListener_RejectsInvalidPath()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromMilliseconds(200)
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/wrong",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var hasDocument = await moveTask.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.False(hasDocument);
    }

    [Fact]
    public async Task CaptureListener_RejectsNonPost()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromMilliseconds(200)
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var response = await client.GetAsync($"http://127.0.0.1:{port}/capture");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        var hasDocument = await moveTask.WaitAsync(TimeSpan.FromSeconds(2));

        Assert.False(hasDocument);
    }

    [Fact]
    public async Task CaptureListener_RequiresTokenBeforeAccepting()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromSeconds(1),
                AccessToken = "secret"
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var request = new HttpRequestMessage(HttpMethod.Post, $"http://127.0.0.1:{port}/capture")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("X-Ada-Scanner-Token", "secret");
        var authorizedResponse = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, authorizedResponse.StatusCode);
        var hasDocument = await moveTask;

        Assert.True(hasDocument);
        Assert.Equal("http://example.test/page", enumerator.Current.Url);
    }

    [Fact]
    public async Task CaptureListener_SkipsWhenSampleRateZero()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromMilliseconds(200)
            },
            SampleRate = 0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var responseJson = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(responseJson);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(document.RootElement.GetProperty("sampled").GetBoolean());

        var hasDocument = await moveTask.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.False(hasDocument);
    }

    [Fact]
    public async Task CaptureListener_SamplesWhenRateBetweenZeroAndOne()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromSeconds(1)
            },
            SampleRate = 0.5,
            Random = new FixedRandom(0.25)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "http://example.test/page", html = "<html></html>" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        var responseJson = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(responseJson);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(document.RootElement.GetProperty("sampled").GetBoolean());

        var hasDocument = await moveTask;
        Assert.True(hasDocument);
    }

    [Fact]
    public async Task CaptureListener_ReturnsBadRequestForInvalidJson()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromMilliseconds(200)
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent("not-json", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var hasDocument = await moveTask.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.False(hasDocument);
    }

    [Fact]
    public async Task CaptureListener_ReturnsBadRequestForInvalidPayload()
    {
        var port = TestUtilities.GetAvailablePort();
        var options = new RuntimeScanOptions
        {
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = port,
                MaxDocuments = 1,
                IdleTimeout = TimeSpan.FromMilliseconds(200)
            },
            SampleRate = 1.0,
            Random = new Random(0)
        };

        var listener = new RuntimeCaptureListener();
        await using var enumerator = listener.GetDocumentsAsync(options).GetAsyncEnumerator();
        var moveTask = enumerator.MoveNextAsync().AsTask();
        await Task.Delay(50);

        using var client = new HttpClient();
        var payload = new { url = "not-a-url" };

        var response = await client.PostAsync(
            $"http://127.0.0.1:{port}/capture",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var hasDocument = await moveTask.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.False(hasDocument);
    }

    private sealed class FixedRandom : Random
    {
        private readonly double _value;

        public FixedRandom(double value)
        {
            _value = value;
        }

        protected override double Sample()
        {
            return _value;
        }
    }
}
