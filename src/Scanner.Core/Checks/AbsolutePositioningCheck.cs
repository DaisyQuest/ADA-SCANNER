using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for absolute positioning that can block reflow.
/// </summary>
public sealed class AbsolutePositioningCheck : ICheck
{
    private static readonly Regex TagRegex = new("<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly string[] CanvasAttributes =
    {
        "Canvas.Left",
        "Canvas.Top",
        "Canvas.Right",
        "Canvas.Bottom",
        "AbsoluteLayout.LayoutBounds"
    };

    /// <inheritdoc />
    public string Id => "absolute-positioning";

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
            var position = StyleUtilities.GetLastPropertyValue(style, "position");
            if (!string.Equals(position, "absolute", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "Element uses absolute positioning.", match.Value);
        }
    }

    private static IEnumerable<Issue> RunXaml(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            if (!HasCanvasPositioning(attrs))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "XAML element uses absolute positioning.", match.Value);
        }
    }

    private static bool HasCanvasPositioning(string attrs)
    {
        foreach (var attribute in CanvasAttributes)
        {
            var value = AttributeParser.GetAttributeValue(attrs, attribute);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return true;
            }
        }

        return false;
    }
}
