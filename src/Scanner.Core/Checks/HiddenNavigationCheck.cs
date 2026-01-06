using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

public sealed class HiddenNavigationCheck : ICheck
{
    private static readonly Regex NavRegex = new("<nav(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex StyleWhitespaceRegex = new("\\s+", RegexOptions.Compiled);

    public string Id => "hidden-navigation";
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in NavRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var ariaHidden = AttributeParser.GetAttributeValue(attrs, "aria-hidden");
            var style = AttributeParser.GetAttributeValue(attrs, "style") ?? string.Empty;
            var hasHidden = TextUtilities.ContainsAttribute(attrs, "hidden", allowBoolean: true);

            if (string.Equals(ariaHidden, "true", StringComparison.OrdinalIgnoreCase)
                || HasHiddenStyle(style)
                || hasHidden)
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                yield return new Issue(rule.Id, Id, context.FilePath, line, "Navigation element is hidden from assistive tech.", match.Value);
            }
        }
    }

    private static bool HasHiddenStyle(string style)
    {
        if (string.IsNullOrWhiteSpace(style))
        {
            return false;
        }

        var normalized = StyleWhitespaceRegex.Replace(style, string.Empty);
        return normalized.Contains("display:none", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("visibility:hidden", StringComparison.OrdinalIgnoreCase);
    }
}
