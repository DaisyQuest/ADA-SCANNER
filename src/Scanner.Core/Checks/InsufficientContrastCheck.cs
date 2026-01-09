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
    private static readonly Regex CssHexRegex = new("#[0-9a-fA-F]{3,8}", RegexOptions.Compiled);
    private static readonly Regex CssRgbRegex = new("rgba?\\([^\\)]+\\)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "insufficient-contrast";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor", "xaml", "css" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (var candidate in GetCandidates(context))
        {
            if (candidate.HasFilter || candidate.HasGradientOrImage)
            {
                continue;
            }

            var foreground = ResolveStaticColor(candidate.Foreground);
            var background = ResolveStaticColor(candidate.Background);
            if (foreground == null || background == null)
            {
                continue;
            }

            if (!ColorContrastAnalyzer.TryParseColor(foreground, out var fg) || !ColorContrastAnalyzer.TryParseColor(background, out var bg))
            {
                continue;
            }

            var ratio = ColorContrastAnalyzer.ContrastRatio(fg, bg);
            var threshold = GetRequiredContrastRatio(candidate);
            if (ratio >= threshold)
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, candidate.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, $"Color contrast ratio {ratio:0.00} is below {threshold:0.0}:1.", candidate.Snippet);
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

                    var fontSize = ParseXamlFontSize(ParseXmlAttribute(attrs, "FontSize"));
                    var isBold = ParseFontWeight(ParseXmlAttribute(attrs, "FontWeight"));
                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value, fontSize, isBold, HasFilter(attrs), false);
                }

                yield break;
            case "css":
                foreach (Match match in CssBlockRegex.Matches(context.Content))
                {
                    var body = match.Groups["body"].Value;
                    var foreground = ParseCssColor(body, "color");
                    var background = ParseCssBackground(body);
                    if (foreground == null || background == null)
                    {
                        continue;
                    }

                    var fontSize = ParseCssFontSize(body);
                    var isBold = ParseFontWeight(ParseCssValue(body, "font-weight"));
                    var hasGradientOrImage = HasGradientOrImage(body);
                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value, fontSize, isBold, HasFilter(body), hasGradientOrImage);
                }

                yield break;
            default:
                foreach (Match match in StyleRegex.Matches(context.Content))
                {
                    var style = match.Groups["style"].Value;
                    var foreground = ParseCssColor(style, "color");
                    var background = ParseCssBackground(style);
                    if (foreground == null || background == null)
                    {
                        continue;
                    }

                    var fontSize = ParseCssFontSize(style);
                    var isBold = ParseFontWeight(ParseCssValue(style, "font-weight"));
                    var hasGradientOrImage = HasGradientOrImage(style);
                    yield return new ContrastCandidate(foreground, background, match.Index, match.Value, fontSize, isBold, HasFilter(style), hasGradientOrImage);
                }

                yield break;
        }
    }

    private static string? ParseCssColor(string style, string property)
    {
        return ParseCssValue(style, property);
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

    private static string? ParseCssValue(string style, string property)
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

    private static string? ParseCssBackground(string style)
    {
        var background = ParseCssValue(style, "background-color") ?? ParseCssValue(style, "background");
        if (string.IsNullOrWhiteSpace(background))
        {
            return null;
        }

        if (background.Contains("url(", StringComparison.OrdinalIgnoreCase)
            || background.Contains("gradient(", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (ColorContrastAnalyzer.TryParseColor(background, out _))
        {
            return background;
        }

        var match = CssHexRegex.Match(background);
        if (match.Success)
        {
            return match.Value;
        }

        match = CssRgbRegex.Match(background);
        if (match.Success)
        {
            return match.Value;
        }

        return background.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault(token => ColorContrastAnalyzer.TryParseColor(token, out _));
    }

    private static double? ParseCssFontSize(string style)
    {
        return ParseFontSize(ParseCssValue(style, "font-size"));
    }

    private static double? ParseXamlFontSize(string? value)
    {
        return ParseFontSize(value);
    }

    private static double? ParseFontSize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        var match = Regex.Match(trimmed, "^(?<size>[0-9.]+)\\s*(?<unit>[a-z%]*)$", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            return null;
        }

        if (!double.TryParse(match.Groups["size"].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var size))
        {
            return null;
        }

        var unit = match.Groups["unit"].Value.ToLowerInvariant();
        return unit switch
        {
            "px" or "" => size,
            "pt" => size * 96 / 72,
            "em" or "rem" => size * 16,
            _ => null
        };
    }

    private static bool ParseFontWeight(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (double.TryParse(value.Trim(), System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var numeric))
        {
            return numeric >= 700;
        }

        return value.Trim().Equals("bold", StringComparison.OrdinalIgnoreCase)
            || value.Trim().Equals("bolder", StringComparison.OrdinalIgnoreCase)
            || value.Trim().Equals("semibold", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasFilter(string style)
    {
        if (string.IsNullOrWhiteSpace(style))
        {
            return false;
        }

        var parts = style.Split(';', StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in parts)
        {
            var kv = part.Split(':', 2, StringSplitOptions.RemoveEmptyEntries);
            if (kv.Length != 2)
            {
                continue;
            }

            var property = kv[0].Trim();
            var value = kv[1].Trim();
            if (property.Equals("filter", StringComparison.OrdinalIgnoreCase)
                || property.Equals("backdrop-filter", StringComparison.OrdinalIgnoreCase)
                || property.Equals("-webkit-filter", StringComparison.OrdinalIgnoreCase))
            {
                if (!value.Equals("none", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static bool HasGradientOrImage(string style)
    {
        if (string.IsNullOrWhiteSpace(style))
        {
            return false;
        }

        var background = ParseCssValue(style, "background");
        var backgroundImage = ParseCssValue(style, "background-image");
        var backgroundValue = string.Join(' ', new[] { background, backgroundImage }.Where(value => !string.IsNullOrWhiteSpace(value)));

        return backgroundValue.Contains("gradient(", StringComparison.OrdinalIgnoreCase)
            || backgroundValue.Contains("url(", StringComparison.OrdinalIgnoreCase);
    }

    private static double GetRequiredContrastRatio(ContrastCandidate candidate)
    {
        if (!candidate.FontSizePx.HasValue)
        {
            return 4.5;
        }

        var fontSize = candidate.FontSizePx.Value;
        var largeText = fontSize >= 24 || (fontSize >= 18.6667 && candidate.IsBold);
        return largeText ? 3.0 : 4.5;
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

    private sealed record ContrastCandidate(
        string Foreground,
        string Background,
        int Index,
        string Snippet,
        double? FontSizePx,
        bool IsBold,
        bool HasFilter,
        bool HasGradientOrImage);
}
