using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks inline styles for insufficient text contrast.
/// </summary>
public sealed class InsufficientContrastCheck : ICheck
{
    private static readonly Regex StyleRegex = new("style=\"(?<style>[^\"]+)\"", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex XamlElementRegex = new("<(?<tag>[\\w:.-]+)(?<attrs>[^>]*?)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CssBlockRegex = new("(?<selector>[^\\{]+)\\{(?<body>[^}]+)\\}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Singleline);

    /// <inheritdoc />
    public string Id => "insufficient-contrast";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor", "xaml", "css" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (var candidate in GetCandidates(context))
        {
            var foreground = ResolveStaticColor(candidate.Foreground);
            var background = ResolveStaticColor(candidate.Background);
            if (foreground == null || background == null)
            {
                continue;
            }

            if (!ColorContrastAnalyzer.TryParseHex(foreground, out var fg) || !ColorContrastAnalyzer.TryParseHex(background, out var bg))
            {
                continue;
            }

            var ratio = ColorContrastAnalyzer.ContrastRatio(fg, bg);
            if (ratio >= 4.5)
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, candidate.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, $"Color contrast ratio {ratio:0.00} is below 4.5:1.", candidate.Snippet);
        }
    }

    private static IEnumerable<ContrastCandidate> GetCandidates(CheckContext context)
    {
        switch (context.Kind.ToLowerInvariant())
        {
            case "xaml":
                foreach (Match match in XamlElementRegex.Matches(context.Content))
                {
                    var attrs = match.Groups["attrs"].Value;
                    var foreground = ParseXmlAttribute(attrs, "Foreground");
                    var background = ParseXmlAttribute(attrs, "Background");
                    if (foreground == null || background == null)
                    {
                        continue;
                    }

                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value);
                }

                yield break;
            case "css":
                foreach (Match match in CssBlockRegex.Matches(context.Content))
                {
                    var body = match.Groups["body"].Value;
                    var foreground = ParseCssColor(body, "color");
                    var background = ParseCssColor(body, "background-color");
                    if (foreground == null || background == null)
                    {
                        continue;
                    }

                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value);
                }

                yield break;
            default:
                foreach (Match match in StyleRegex.Matches(context.Content))
                {
                    var style = match.Groups["style"].Value;
                    var foreground = ParseCssColor(style, "color");
                    var background = ParseCssColor(style, "background-color");
                    if (foreground == null || background == null)
                    {
                        continue;
                    }

                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value);
                }

                yield break;
        }
    }

    private static string? ParseCssColor(string style, string property)
    {
        var parts = style.Split(';', StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in parts)
        {
            var kv = part.Split(':', 2, StringSplitOptions.RemoveEmptyEntries);
            if (kv.Length != 2)
            {
                continue;
            }

            if (kv[0].Trim().Equals(property, StringComparison.OrdinalIgnoreCase))
            {
                return kv[1].Trim();
            }
        }

        return null;
    }

    private static string? ParseXmlAttribute(string attributes, string attribute)
    {
        var pattern = $"{attribute}\\s*=\\s*\"(?<value>[^\"]+)\"";
        var match = Regex.Match(attributes, pattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
        return match.Success ? match.Groups["value"].Value.Trim() : null;
    }

    private static string? ResolveStaticColor(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = NormalizeColorValue(value);
        if (trimmed.StartsWith("var(", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = ExtractCssVarFallback(trimmed) ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return null;
        }

        if (trimmed.StartsWith("{", StringComparison.Ordinal) && trimmed.EndsWith("}", StringComparison.Ordinal))
        {
            trimmed = ExtractXamlFallback(trimmed) ?? string.Empty;
        }

        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string NormalizeColorValue(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.EndsWith("!important", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = trimmed[..^"!important".Length].Trim();
        }

        return trimmed;
    }

    private static string? ExtractCssVarFallback(string value)
    {
        var start = value.IndexOf('(');
        var end = value.LastIndexOf(')');
        if (start < 0 || end <= start)
        {
            return null;
        }

        var inner = value[(start + 1)..end];
        var commaIndex = inner.IndexOf(',');
        if (commaIndex < 0)
        {
            return null;
        }

        return NormalizeColorValue(inner[(commaIndex + 1)..]);
    }

    private static string? ExtractXamlFallback(string value)
    {
        var fallbackIndex = value.IndexOf("FallbackValue=", StringComparison.OrdinalIgnoreCase);
        if (fallbackIndex < 0)
        {
            return null;
        }

        var start = fallbackIndex + "FallbackValue=".Length;
        var remainder = value[start..];
        var endIndex = remainder.IndexOfAny(new[] { ',', '}' });
        var candidate = endIndex >= 0 ? remainder[..endIndex] : remainder;
        return NormalizeColorValue(candidate.Trim().Trim('"'));
    }

    private sealed record ContrastCandidate(string Foreground, string Background, int Index, string Snippet);
}
