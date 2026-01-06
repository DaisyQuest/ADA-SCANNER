using System.Globalization;
using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for fixed-width layouts that can block reflow.
/// </summary>
public sealed class FixedWidthLayoutCheck : ICheck
{
    private static readonly Regex TagRegex = new("<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "fixed-width-layout";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor", "xaml" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        if (context.Kind.Equals("xaml", StringComparison.OrdinalIgnoreCase))
        {
            return RunXaml(context, rule);
        }

        return RunMarkup(context, rule);
    }

    private static IEnumerable<Issue> RunMarkup(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var style = AttributeParser.GetAttributeValue(attrs, "style");
            var width = StyleUtilities.GetLastPropertyValue(style, "width");
            if (width == null || !StyleUtilities.IsFixedLength(width))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "Element uses a fixed width.", match.Value);
        }
    }

    private static IEnumerable<Issue> RunXaml(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var widthValue = AttributeParser.GetAttributeValue(attrs, "Width");
            if (!IsFixedWidthValue(widthValue))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "XAML element uses a fixed width.", match.Value);
        }
    }

    private static bool IsFixedWidthValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (value.Equals("Auto", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (value.Contains('*'))
        {
            return false;
        }

        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && number > 0;
    }
}
