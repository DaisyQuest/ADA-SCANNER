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

    /// <summary>
    /// Gets the unique identifier for this check.
    /// </summary>
    public static string Id => "fixed-width-layout";

    /// <inheritdoc />
    string ICheck.Id => Id;

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

    private static readonly string[] StyleWidthProperties = { "width", "min-width" };

    private static IEnumerable<Issue> RunMarkup(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var style = AttributeParser.GetAttributeValue(attrs, "style");
            if (TryGetFixedStyleWidth(style, out var propertyName, out var propertyValue))
            {
                var styleLineNumber = TextUtilities.GetLineNumber(context.Content, match.Index);
                var description = $"Element uses fixed {DescribeProperty(propertyName)} ({propertyName}: {propertyValue}).";
                yield return new Issue(rule.Id, Id, context.FilePath, styleLineNumber, description, match.Value);
                continue;
            }

            var widthAttribute = AttributeParser.GetAttributeValue(attrs, "width");
            if (!IsFixedMarkupLength(widthAttribute))
            {
                continue;
            }

            var widthLineNumber = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(
                rule.Id,
                Id,
                context.FilePath,
                widthLineNumber,
                $"Element uses a fixed width attribute (width=\"{widthAttribute}\").",
                match.Value);
        }
    }

    private static IEnumerable<Issue> RunXaml(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var widthValue = AttributeParser.GetAttributeValue(attrs, "Width");
            if (IsFixedWidthValue(widthValue))
            {
                var widthLineNumber = TextUtilities.GetLineNumber(context.Content, match.Index);
                yield return new Issue(
                    rule.Id,
                    Id,
                    context.FilePath,
                    widthLineNumber,
                    $"XAML element uses fixed width (Width=\"{widthValue}\").",
                    match.Value);
                continue;
            }

            var minWidthValue = AttributeParser.GetAttributeValue(attrs, "MinWidth");
            if (!IsFixedWidthValue(minWidthValue))
            {
                continue;
            }

            var minWidthLineNumber = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(
                rule.Id,
                Id,
                context.FilePath,
                minWidthLineNumber,
                $"XAML element uses fixed minimum width (MinWidth=\"{minWidthValue}\").",
                match.Value);
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

    private static bool TryGetFixedStyleWidth(string? style, out string propertyName, out string propertyValue)
    {
        foreach (var property in StyleWidthProperties)
        {
            var value = StyleUtilities.GetLastPropertyValue(style, property);
            if (!string.IsNullOrWhiteSpace(value) && StyleUtilities.IsFixedLength(value))
            {
                propertyName = property;
                propertyValue = value;
                return true;
            }
        }

        propertyName = string.Empty;
        propertyValue = string.Empty;
        return false;
    }

    private static bool IsFixedMarkupLength(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.EndsWith('%'))
        {
            return false;
        }

        if (StyleUtilities.IsFixedLength(trimmed))
        {
            return true;
        }

        return double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && number > 0;
    }

    private static string DescribeProperty(string propertyName)
    {
        return propertyName.Equals("min-width", StringComparison.OrdinalIgnoreCase)
            ? "minimum width"
            : "width";
    }
}
