using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;

namespace Scanner.Core.Runtime;

/// <summary>
/// Crawls HTTP endpoints to capture runtime HTML documents.
/// </summary>
public sealed class HttpRuntimeCrawler : IRuntimeDocumentSource
{
    private static readonly Regex LinkRegex = new(
        "href\\s*=\\s*['\\\"](?<href>[^'\\\"#>]+)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly HttpClient _client;
    private readonly RuntimeFormExtractor _formExtractor = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="HttpRuntimeCrawler"/> class.
    /// </summary>
    /// <param name="client">The HTTP client used for requests.</param>
    public HttpRuntimeCrawler(HttpClient client)
    {
        _client = client;
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
        RuntimeScanOptions options,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (options.SeedUrls.Count == 0 || options.MaxPages <= 0)
        {
            yield break;
        }

        var includePatterns = CompilePatterns(options.IncludeUrlPatterns);
        var excludePatterns = CompilePatterns(options.ExcludeUrlPatterns);

        var queue = new Queue<QueueEntry>();
        var visitedRequests = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var seed in options.SeedUrls)
        {
            TryEnqueueRequest(
                seed,
                0,
                options.MaxDepth,
                includePatterns,
                excludePatterns,
                visitedRequests,
                queue,
                HttpMethod.Get,
                null,
                BuildRequestKey(HttpMethod.Get, seed, null));
        }

        var processed = 0;
        while (queue.Count > 0 && processed < options.MaxPages)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var entry = queue.Dequeue();
            var current = entry.Url;
            processed++;

            using var request = new HttpRequestMessage(entry.Method, current);
            if (entry.FormValues != null)
            {
                request.Content = new FormUrlEncodedContent(entry.FormValues);
            }
            ApplyHeaders(request.Headers, options.AuthHeaders);

            HttpResponseMessage response;
            try
            {
                response = await _client.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken).ConfigureAwait(false);
            }
            catch
            {
                continue;
            }

            using (response)
            {
                var contentType = response.Content.Headers.ContentType?.MediaType;
                var body = await ReadBodyAsync(response.Content, options.MaxBodyBytes, cancellationToken)
                    .ConfigureAwait(false);

                if (IsAllowedStatusCode(response.StatusCode, options.AllowedStatusCodes, options.ExcludedStatusCodes)
                    && IsAllowedContentType(contentType, options.AllowedContentTypes, options.ExcludedContentTypes))
                {
                    if (ShouldSample(options))
                    {
                        yield return new RuntimeHtmlDocument(
                            current.ToString(),
                            (int)response.StatusCode,
                            contentType,
                            body,
                            DateTimeOffset.UtcNow);
                    }

                    if (entry.Depth < options.MaxDepth && ShouldExtractLinks(contentType))
                    {
                        foreach (var link in ExtractLinks(body, current))
                        {
                            TryEnqueueRequest(
                                link,
                                entry.Depth + 1,
                                options.MaxDepth,
                                includePatterns,
                                excludePatterns,
                                visitedRequests,
                                queue,
                                HttpMethod.Get,
                                null,
                                BuildRequestKey(HttpMethod.Get, link, null));
                        }

                        EnqueueConfiguredForms(options, body, current, entry.Depth + 1, includePatterns, excludePatterns, visitedRequests, queue);
                    }
                }
            }
        }
    }

    private static void ApplyHeaders(HttpRequestHeaders headers, IReadOnlyDictionary<string, string> authHeaders)
    {
        foreach (var header in authHeaders)
        {
            headers.Remove(header.Key);
            headers.TryAddWithoutValidation(header.Key, header.Value);
        }
    }

    private static IReadOnlyList<Regex> CompilePatterns(IReadOnlyList<string> patterns)
    {
        if (patterns.Count == 0)
        {
            return Array.Empty<Regex>();
        }

        return patterns.Select(pattern => new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.Compiled)).ToList();
    }

    private static bool TryEnqueueRequest(
        Uri url,
        int depth,
        int maxDepth,
        IReadOnlyList<Regex> includePatterns,
        IReadOnlyList<Regex> excludePatterns,
        ISet<string> visitedRequests,
        Queue<QueueEntry> queue,
        HttpMethod method,
        IReadOnlyDictionary<string, string>? formValues,
        string requestKey)
    {
        if (depth > maxDepth)
        {
            return false;
        }

        if (!IsHttp(url))
        {
            return false;
        }

        var absolute = url.AbsoluteUri;
        if (!MatchesPatterns(absolute, includePatterns, excludePatterns))
        {
            return false;
        }

        if (!visitedRequests.Add(requestKey))
        {
            return false;
        }

        queue.Enqueue(new QueueEntry(url, depth, method, formValues));
        return true;
    }

    private static bool IsHttp(Uri url)
    {
        return url.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || url.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
    }

    private static bool MatchesPatterns(
        string url,
        IReadOnlyList<Regex> includePatterns,
        IReadOnlyList<Regex> excludePatterns)
    {
        if (excludePatterns.Any(pattern => pattern.IsMatch(url)))
        {
            return false;
        }

        if (includePatterns.Count == 0)
        {
            return true;
        }

        return includePatterns.Any(pattern => pattern.IsMatch(url));
    }

    private static bool IsAllowedStatusCode(
        System.Net.HttpStatusCode statusCode,
        IReadOnlyList<int> allowed,
        IReadOnlyList<int> excluded)
    {
        var code = (int)statusCode;
        if (excluded.Contains(code))
        {
            return false;
        }

        return allowed.Count == 0 || allowed.Contains(code);
    }

    private static bool IsAllowedContentType(
        string? contentType,
        IReadOnlyList<string> allowed,
        IReadOnlyList<string> excluded)
    {
        if (string.IsNullOrWhiteSpace(contentType))
        {
            return false;
        }

        if (excluded.Any(type => contentType.Contains(type, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        if (allowed.Count == 0)
        {
            return contentType.Contains("text/html", StringComparison.OrdinalIgnoreCase);
        }

        return allowed.Any(type => contentType.Contains(type, StringComparison.OrdinalIgnoreCase));
    }

    private static bool ShouldExtractLinks(string? contentType)
    {
        return !string.IsNullOrWhiteSpace(contentType)
            && contentType.Contains("html", StringComparison.OrdinalIgnoreCase);
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

    private static IEnumerable<Uri> ExtractLinks(string html, Uri baseUrl)
    {
        foreach (Match match in LinkRegex.Matches(html))
        {
            var href = match.Groups["href"].Value;
            if (string.IsNullOrWhiteSpace(href))
            {
                continue;
            }

            if (!Uri.TryCreate(baseUrl, href, out var uri))
            {
                continue;
            }

            yield return uri;
        }
    }

    private static async Task<string> ReadBodyAsync(HttpContent content, int maxBytes, CancellationToken cancellationToken)
    {
        if (maxBytes <= 0)
        {
            return string.Empty;
        }

        await using var stream = await content.ReadAsStreamAsync(cancellationToken).ConfigureAwait(false);
        var buffer = new byte[8192];
        var total = 0;
        using var memory = new MemoryStream();

        while (total < maxBytes)
        {
            var toRead = Math.Min(buffer.Length, maxBytes - total);
            var read = await stream.ReadAsync(buffer.AsMemory(0, toRead), cancellationToken).ConfigureAwait(false);
            if (read == 0)
            {
                break;
            }

            memory.Write(buffer, 0, read);
            total += read;
        }

        return Encoding.UTF8.GetString(memory.ToArray());
    }

    private static string BuildRequestKey(HttpMethod method, Uri url, IReadOnlyDictionary<string, string>? formValues)
    {
        if (formValues == null || formValues.Count == 0)
        {
            return $"{method.Method}::{url.AbsoluteUri}";
        }

        var sorted = formValues.OrderBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase)
            .Select(pair => $"{pair.Key}={pair.Value}");
        return $"{method.Method}::{url.AbsoluteUri}::{string.Join("&", sorted)}";
    }

    private void EnqueueConfiguredForms(
        RuntimeScanOptions options,
        string html,
        Uri baseUrl,
        int depth,
        IReadOnlyList<Regex> includePatterns,
        IReadOnlyList<Regex> excludePatterns,
        ISet<string> visitedRequests,
        Queue<QueueEntry> queue)
    {
        if (options.FormConfigurationStore == null)
        {
            return;
        }

        var forms = _formExtractor.Extract(html, baseUrl);
        if (forms.Count == 0)
        {
            return;
        }

        options.FormConfigurationStore.RegisterDiscoveredForms(forms);

        foreach (var form in forms)
        {
            var configuration = options.FormConfigurationStore.Find(form.Key);
            if (configuration == null || !configuration.Enabled)
            {
                continue;
            }

            if (!Uri.TryCreate(form.Action, UriKind.Absolute, out var actionUri))
            {
                continue;
            }

            var values = BuildSubmissionValues(configuration);
            var method = new HttpMethod(form.Method.ToUpperInvariant());
            var request = BuildFormRequest(actionUri, method, values);
            var requestKey = BuildRequestKey(request.Method, request.Url, request.FormValues);

            TryEnqueueRequest(
                request.Url,
                depth,
                options.MaxDepth,
                includePatterns,
                excludePatterns,
                visitedRequests,
                queue,
                request.Method,
                request.FormValues,
                requestKey);
        }
    }

    private static IReadOnlyDictionary<string, string> BuildSubmissionValues(RuntimeFormConfiguration configuration)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var input in configuration.Inputs)
        {
            var value = !string.IsNullOrWhiteSpace(input.Value) ? input.Value : input.DefaultValue;
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            values[input.Name] = value;
        }

        return values;
    }

    private static FormRequest BuildFormRequest(Uri action, HttpMethod method, IReadOnlyDictionary<string, string> values)
    {
        if (method == HttpMethod.Get)
        {
            var url = AppendQuery(action, values);
            return new FormRequest(url, HttpMethod.Get, null);
        }

        return new FormRequest(action, method, values);
    }

    private static Uri AppendQuery(Uri action, IReadOnlyDictionary<string, string> values)
    {
        if (values.Count == 0)
        {
            return action;
        }

        var builder = new UriBuilder(action);
        var query = string.Join("&", values.Select(pair =>
            $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
        if (string.IsNullOrWhiteSpace(builder.Query))
        {
            builder.Query = query;
        }
        else
        {
            builder.Query = builder.Query.TrimStart('?') + "&" + query;
        }

        return builder.Uri;
    }

    private sealed record QueueEntry(
        Uri Url,
        int Depth,
        HttpMethod Method,
        IReadOnlyDictionary<string, string>? FormValues);

    private sealed record FormRequest(Uri Url, HttpMethod Method, IReadOnlyDictionary<string, string>? FormValues);
}
