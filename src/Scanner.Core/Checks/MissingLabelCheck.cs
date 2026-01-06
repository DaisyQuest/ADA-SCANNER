using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks form controls for missing accessible labels.
/// </summary>
public sealed class MissingLabelCheck : ICheck
{
    private static readonly Regex InputRegex = new("<(input|select|textarea)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var labels = AccessibleNameUtilities.CollectLabelForIds(context.Content);
        var labelRanges = AccessibleNameUtilities.CollectLabelRanges(context.Content);
        var elementIds = AccessibleNameUtilities.CollectElementIds(context.Content);

        foreach (Match match in InputRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var type = AttributeParser.GetAttributeValue(attrs, "type");
            if (string.Equals(type, "hidden", StringComparison.OrdinalIgnoreCase))
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

            var id = AttributeParser.GetAttributeValue(attrs, "id");
            if (AccessibleNameUtilities.HasLabelForId(id, labels))
            {
                continue;
            }

            if (AccessibleNameUtilities.IsWithinLabel(match.Index, labelRanges))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Form control missing accessible label.", match.Value));
        }

        return issues;
    }
}
