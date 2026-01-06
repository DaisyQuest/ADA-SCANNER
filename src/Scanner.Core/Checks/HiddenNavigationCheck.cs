using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

public sealed class HiddenNavigationCheck : ICheck
{
    private static readonly Regex NavRegex = new("<nav(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public string Id => "hidden-navigation";
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in NavRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var ariaHidden = AttributeParser.GetAttributeValue(attrs, "aria-hidden");
            var style = AttributeParser.GetAttributeValue(attrs, "style") ?? string.Empty;
            var hasHidden = TextUtilities.ContainsAttribute(attrs, "hidden");

            if (string.Equals(ariaHidden, "true", StringComparison.OrdinalIgnoreCase)
                || style.Contains("display:none", StringComparison.OrdinalIgnoreCase)
                || style.Contains("visibility:hidden", StringComparison.OrdinalIgnoreCase)
                || hasHidden)
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                yield return new Issue(rule.Id, Id, context.FilePath, line, "Navigation element is hidden from assistive tech.", match.Value);
            }
        }
    }
}
