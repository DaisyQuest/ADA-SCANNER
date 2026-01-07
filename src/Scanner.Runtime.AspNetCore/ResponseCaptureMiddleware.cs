using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Scanner.Core.Runtime;

namespace Scanner.Runtime.AspNetCore;

/// <summary>
/// Middleware that captures HTML responses for runtime scanning.
/// </summary>
public sealed class ResponseCaptureMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ResponseCaptureChannel _channel;
    private readonly ResponseCaptureOptions _options;

    /// <summary>
    /// Initializes a new instance of the <see cref="ResponseCaptureMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="channel">The channel used to enqueue captured documents.</param>
    /// <param name="options">The capture options.</param>
    public ResponseCaptureMiddleware(
        RequestDelegate next,
        ResponseCaptureChannel channel,
        ResponseCaptureOptions options)
    {
        _next = next;
        _channel = channel;
        _options = options;
    }

    /// <summary>
    /// Executes the middleware.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        var originalBody = context.Response.Body;
        using var captureStream = new CappedTeeStream(originalBody, _options.MaxBodyBytes);
        context.Response.Body = captureStream;

        try
        {
            await _next(context).ConfigureAwait(false);
        }
        finally
        {
            context.Response.Body = originalBody;
        }

        if (!IsHtml(context.Response.ContentType))
        {
            return;
        }

        var body = Encoding.UTF8.GetString(captureStream.GetCapturedBytes());
        var document = new RuntimeHtmlDocument(
            context.Request.GetDisplayUrl(),
            context.Response.StatusCode,
            context.Response.ContentType,
            body,
            DateTimeOffset.UtcNow);

        await _channel.EnqueueAsync(document, context.RequestAborted).ConfigureAwait(false);
    }

    private static bool IsHtml(string? contentType)
    {
        return !string.IsNullOrWhiteSpace(contentType)
            && contentType.Contains("text/html", StringComparison.OrdinalIgnoreCase);
    }
}
