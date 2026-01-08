using System.Net;
using System.Text;
using System.Text.Json;

namespace Scanner.Core.Runtime;

/// <summary>
/// Listens for runtime HTML documents posted from a browser window.
/// </summary>
public sealed class RuntimeCaptureListener : IRuntimeDocumentSource
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly JsonSerializerOptions ResponseSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    /// <inheritdoc />
    public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
        RuntimeScanOptions options,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (options.CaptureOptions == null)
        {
            yield break;
        }

        var captureOptions = options.CaptureOptions;
        var path = NormalizePath(captureOptions.Path);
        var listener = new HttpListener();
        var prefix = BuildPrefix(captureOptions.Host, captureOptions.Port);
        listener.Prefixes.Add(prefix);
        listener.Start();

        var captured = 0;
        try
        {
            while (captured < captureOptions.MaxDocuments)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var contextTask = listener.GetContextAsync();
                var timeoutTask = Task.Delay(captureOptions.IdleTimeout, cancellationToken);
                var completed = await Task.WhenAny(contextTask, timeoutTask).ConfigureAwait(false);
                if (completed != contextTask)
                {
                    yield break;
                }

                var context = await contextTask.ConfigureAwait(false);
                if (!IsValidRequest(context.Request, path, captureOptions.AccessToken, out var errorStatus, out var errorMessage))
                {
                    await WriteResponseAsync(context.Response, errorStatus, errorMessage, sampled: false, capturedUrl: null)
                        .ConfigureAwait(false);
                    continue;
                }

                var payload = await TryReadPayloadAsync(context.Request, cancellationToken).ConfigureAwait(false);
                if (payload == null || string.IsNullOrWhiteSpace(payload.Url) || string.IsNullOrWhiteSpace(payload.Html))
                {
                    await WriteResponseAsync(context.Response, HttpStatusCode.BadRequest, "Invalid payload.", sampled: false, capturedUrl: null)
                        .ConfigureAwait(false);
                    continue;
                }

                if (!Uri.TryCreate(payload.Url, UriKind.Absolute, out var url))
                {
                    await WriteResponseAsync(context.Response, HttpStatusCode.BadRequest, "Invalid URL.", sampled: false, capturedUrl: null)
                        .ConfigureAwait(false);
                    continue;
                }

                var html = TrimToMaxBytes(payload.Html, options.MaxBodyBytes);
                var contentType = string.IsNullOrWhiteSpace(payload.ContentType) ? "text/html" : payload.ContentType;
                var statusCode = payload.StatusCode ?? 200;
                var sampled = ShouldSample(options);

                await WriteResponseAsync(context.Response, HttpStatusCode.OK, "Captured.", sampled, url.ToString())
                    .ConfigureAwait(false);

                if (!sampled)
                {
                    continue;
                }

                captured++;
                yield return new RuntimeHtmlDocument(
                    url.ToString(),
                    statusCode,
                    contentType,
                    html,
                    DateTimeOffset.UtcNow);
            }
        }
        finally
        {
            listener.Stop();
            listener.Close();
        }
    }

    private static string NormalizePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/capture";
        }

        return path.StartsWith('/') ? path : "/" + path;
    }

    private static string BuildPrefix(string host, int port)
    {
        var resolvedHost = string.IsNullOrWhiteSpace(host) ? "127.0.0.1" : host;
        return $"http://{resolvedHost}:{port}/";
    }

    private static bool IsValidRequest(
        HttpListenerRequest request,
        string path,
        string? accessToken,
        out HttpStatusCode status,
        out string message)
    {
        if (!HttpMethodsMatch(request, "POST"))
        {
            status = HttpStatusCode.MethodNotAllowed;
            message = "Only POST is supported.";
            return false;
        }

        var requestPath = request.Url?.AbsolutePath ?? string.Empty;
        if (!requestPath.Equals(path, StringComparison.OrdinalIgnoreCase))
        {
            status = HttpStatusCode.NotFound;
            message = "Unknown capture path.";
            return false;
        }

        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            var provided = request.Headers["X-Ada-Scanner-Token"];
            if (!string.Equals(provided, accessToken, StringComparison.Ordinal))
            {
                status = HttpStatusCode.Unauthorized;
                message = "Missing or invalid token.";
                return false;
            }
        }

        status = HttpStatusCode.OK;
        message = string.Empty;
        return true;
    }

    private static bool HttpMethodsMatch(HttpListenerRequest request, string method)
    {
        return request.HttpMethod.Equals(method, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<RuntimeCapturePayload?> TryReadPayloadAsync(HttpListenerRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = request.InputStream;
            return await JsonSerializer.DeserializeAsync<RuntimeCapturePayload>(stream, SerializerOptions, cancellationToken)
                .ConfigureAwait(false);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string TrimToMaxBytes(string html, int maxBytes)
    {
        if (maxBytes <= 0)
        {
            return string.Empty;
        }

        var bytes = Encoding.UTF8.GetBytes(html);
        if (bytes.Length <= maxBytes)
        {
            return html;
        }

        var trimmed = new byte[maxBytes];
        Array.Copy(bytes, trimmed, maxBytes);
        return Encoding.UTF8.GetString(trimmed);
    }

    private static bool ShouldSample(RuntimeScanOptions options)
    {
        var rate = Math.Clamp(options.SampleRate, 0, 1);
        if (rate <= 0)
        {
            return false;
        }

        if (rate >= 1)
        {
            return true;
        }

        return options.Random.NextDouble() <= rate;
    }

    private static async Task WriteResponseAsync(
        HttpListenerResponse response,
        HttpStatusCode statusCode,
        string message,
        bool sampled,
        string? capturedUrl)
    {
        response.StatusCode = (int)statusCode;
        response.ContentType = "application/json";

        var payload = new RuntimeCaptureResponse
        {
            Message = message,
            Sampled = sampled,
            Url = capturedUrl
        };

        var json = JsonSerializer.Serialize(payload, ResponseSerializerOptions);
        var buffer = Encoding.UTF8.GetBytes(json);
        response.ContentLength64 = buffer.Length;
        await response.OutputStream.WriteAsync(buffer).ConfigureAwait(false);
        response.OutputStream.Close();
    }

    private sealed class RuntimeCapturePayload
    {
        public string? Url { get; init; }

        public string? Html { get; init; }

        public string? ContentType { get; init; }

        public int? StatusCode { get; init; }
    }

    private sealed class RuntimeCaptureResponse
    {
        public string Message { get; init; } = string.Empty;

        public bool Sampled { get; init; }

        public string? Url { get; init; }
    }
}
