using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for links that lack accessible names.
/// </summary>
public sealed class EmptyLinkCheck : ICheck
{
    private static readonly Regex LinkRegex = new("<a(?<attrs>[^>]*)>(?<content>.*?)</a>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "empty-link";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var elementIds = AccessibleNameUtilities.CollectElementIds(context.Content);

        foreach (Match match in LinkRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            if (!IsLink(attrs))
            {
                continue;
            }

            var content = match.Groups["content"].Value;
            if (AccessibleNameUtilities.HasTextContent(content))
            {
                continue;
            }

            var ariaLabel = AttributeParser.GetAttributeValue(attrs, "aria-label");
            if (AccessibleNameUtilities.HasAriaLabel(ariaLabel))
            {
                continue;
            }

            var ariaLabelledBy = AttributeParser.GetAttributeValue(attrs, "aria-labelledby");
            if (AccessibleNameUtilities.HasValidAriaLabelledBy(ariaLabelledBy, elementIds))
            {
                continue;
            }

            var title = AttributeParser.GetAttributeValue(attrs, "title");
            if (AccessibleNameUtilities.HasTitle(title))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Link has no accessible name.", match.Value));
        }

        return issues;
    }

    private static bool IsLink(string attributes)
    {
        if (TextUtilities.ContainsAttribute(attributes, "href"))
        {
            return true;
        }

        var role = AttributeParser.GetAttributeValue(attributes, "role");
        return string.Equals(role, "link", StringComparison.OrdinalIgnoreCase);
    }
}
