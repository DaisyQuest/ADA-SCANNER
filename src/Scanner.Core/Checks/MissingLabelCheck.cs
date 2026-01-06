using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks form controls for missing accessible labels.
/// </summary>
public sealed class MissingLabelCheck : ICheck
{
    private static readonly Regex InputRegex = new("<(input|select|textarea)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LabelRegex = new("<label(?<attrs>[^>]*)>(?<content>.*?)</label>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var labelsByFor = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var labelRanges = new List<(int Start, int End, bool HasText)>();
        foreach (Match match in LabelRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var labelText = AccessibleNameHelper.StripTags(match.Groups["content"].Value);
            var hasText = !string.IsNullOrWhiteSpace(labelText);
            labelRanges.Add((match.Index, match.Index + match.Length, hasText));

            var forValue = AttributeParser.GetAttributeValue(attrs, "for");
            if (!string.IsNullOrWhiteSpace(forValue) && hasText)
            {
                labelsByFor.Add(forValue);
            }
        }

        var (ids, textById) = AccessibleNameHelper.BuildIdIndex(context.Content);

        foreach (Match match in InputRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var type = AttributeParser.GetAttributeValue(attrs, "type");
            if (string.Equals(type, "hidden", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var ariaLabel = AttributeParser.GetAttributeValue(attrs, "aria-label");
            if (!string.IsNullOrWhiteSpace(ariaLabel))
            {
                continue;
            }

            var ariaLabelledBy = AttributeParser.GetAttributeValue(attrs, "aria-labelledby");
            if (!string.IsNullOrWhiteSpace(ariaLabelledBy))
            {
                if (AccessibleNameHelper.IsAriaLabelledByValid(ariaLabelledBy, ids, textById))
                {
                    continue;
                }
            }

            var id = AttributeParser.GetAttributeValue(attrs, "id");
            if (!string.IsNullOrWhiteSpace(id) && labelsByFor.Contains(id))
            {
                continue;
            }

            if (IsWrappedByLabel(match.Index, labelRanges))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Form control missing accessible label.", match.Value));
        }

        return issues;
    }

    private static bool IsWrappedByLabel(int elementIndex, IEnumerable<(int Start, int End, bool HasText)> labelRanges)
    {
        foreach (var (start, end, hasText) in labelRanges)
        {
            if (hasText && elementIndex >= start && elementIndex <= end)
            {
                return true;
            }
        }

        return false;
    }
}
