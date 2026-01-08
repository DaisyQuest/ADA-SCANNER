using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for form labels that lack readable text content.
/// </summary>
public sealed class EmptyFormLabelCheck : ICheck
{
    private static readonly Regex LabelRegex = new("<label(?<attrs>[^>]*)>(?<content>.*?)</label>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "empty-form-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var elementIds = AccessibleNameUtilities.CollectElementIds(context.Content);

        foreach (Match match in LabelRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
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
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Form label has no readable text.", match.Value));
        }

        return issues;
    }
}
