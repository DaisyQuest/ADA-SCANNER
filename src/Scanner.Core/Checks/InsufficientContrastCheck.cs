using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks inline styles for insufficient text contrast.
/// </summary>
public sealed class InsufficientContrastCheck : ICheck
{
    private static readonly Regex StyleRegex = new("style=\"(?<style>[^\"]+)\"", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "insufficient-contrast";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in StyleRegex.Matches(context.Content))
        {
            var style = match.Groups["style"].Value;
            var foreground = ParseCssColor(style, "color");
            var background = ParseCssColor(style, "background-color");
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

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, $"Color contrast ratio {ratio:0.00} is below 4.5:1.", match.Value);
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
}
