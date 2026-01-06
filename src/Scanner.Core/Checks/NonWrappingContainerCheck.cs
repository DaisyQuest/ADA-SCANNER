using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for containers that disable text wrapping.
/// </summary>
public sealed class NonWrappingContainerCheck : ICheck
{
    private static readonly Regex TagRegex = new("<(?<tag>[a-zA-Z0-9:-]+)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "non-wrapping-container";

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
            var whiteSpace = StyleUtilities.GetLastPropertyValue(style, "white-space");
            if (!string.Equals(whiteSpace, "nowrap", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "Element prevents text wrapping.", match.Value);
        }
    }

    private static IEnumerable<Issue> RunXaml(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in TagRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var wrapping = AttributeParser.GetAttributeValue(attrs, "TextWrapping");
            if (!string.Equals(wrapping, "NoWrap", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "XAML element disables text wrapping.", match.Value);
        }
    }
}
