using Microsoft.AspNetCore.Http;
using Scanner.Runtime.AspNetCore;
using Xunit;

namespace Scanner.Tests;

public sealed class ResponseCaptureMiddlewareTests
{
    [Fact]
    public async Task Middleware_CapturesHtmlResponses()
    {
        var options = new ResponseCaptureOptions { MaxBodyBytes = 1024, ChannelCapacity = 1 };
        var channel = new ResponseCaptureChannel(options);
        var middleware = new ResponseCaptureMiddleware(async context =>
        {
            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync("<html><body>Hello</body></html>");
        }, channel, options);

        var context = CreateContext();
        await middleware.InvokeAsync(context);

        var document = await channel.Reader.ReadAsync();
        Assert.Equal("http://example.test/", document.Url);
        Assert.Contains("Hello", document.Body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Middleware_IgnoresNonHtmlResponses()
    {
        var options = new ResponseCaptureOptions { MaxBodyBytes = 1024, ChannelCapacity = 1 };
        var channel = new ResponseCaptureChannel(options);
        var middleware = new ResponseCaptureMiddleware(async context =>
        {
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"ok\":true}");
        }, channel, options);

        var context = CreateContext();
        await middleware.InvokeAsync(context);

        Assert.False(channel.Reader.TryRead(out _));
    }

    [Fact]
    public async Task Middleware_RespectsSizeLimit()
    {
        var options = new ResponseCaptureOptions { MaxBodyBytes = 5, ChannelCapacity = 1 };
        var channel = new ResponseCaptureChannel(options);
        var middleware = new ResponseCaptureMiddleware(async context =>
        {
            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync("<html>0123456789</html>");
        }, channel, options);

        var context = CreateContext();
        await middleware.InvokeAsync(context);

        var document = await channel.Reader.ReadAsync();
        Assert.True(document.Body.Length <= 5);
    }

    [Fact]
    public async Task Middleware_PropagatesExceptionsWithoutEnqueue()
    {
        var options = new ResponseCaptureOptions { MaxBodyBytes = 1024, ChannelCapacity = 1 };
        var channel = new ResponseCaptureChannel(options);
        var middleware = new ResponseCaptureMiddleware(_ => throw new InvalidOperationException("boom"), channel, options);

        var context = CreateContext();

        await Assert.ThrowsAsync<InvalidOperationException>(() => middleware.InvokeAsync(context));
        Assert.False(channel.Reader.TryRead(out _));
    }

    [Fact]
    public async Task Middleware_WaitsForChannelCapacity()
    {
        var options = new ResponseCaptureOptions { MaxBodyBytes = 1024, ChannelCapacity = 1 };
        var channel = new ResponseCaptureChannel(options);
        var middleware = new ResponseCaptureMiddleware(async context =>
        {
            context.Response.ContentType = "text/html";
            await context.Response.WriteAsync("<html>payload</html>");
        }, channel, options);

        var context1 = CreateContext();
        await middleware.InvokeAsync(context1);

        var context2 = CreateContext();
        var pending = middleware.InvokeAsync(context2);

        await Task.Delay(50);
        Assert.False(pending.IsCompleted);

        _ = await channel.Reader.ReadAsync();
        await pending;

        Assert.True(channel.Reader.TryRead(out _));
    }

    private static DefaultHttpContext CreateContext()
    {
        return new DefaultHttpContext
        {
            Request =
            {
                Scheme = "http",
                Host = new HostString("example.test"),
                Path = "/"
            },
            Response =
            {
                Body = new MemoryStream()
            }
        };
    }
}
