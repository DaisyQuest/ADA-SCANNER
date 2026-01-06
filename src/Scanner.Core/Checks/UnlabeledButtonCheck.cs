using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks button elements for missing accessible labels.
/// </summary>
public sealed class UnlabeledButtonCheck : ICheck
{
    private static readonly Regex ButtonRegex = new("<button(?<attrs>[^>]*)>(?<content>.*?)</button>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex InputRegex = new("<input(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly HashSet<string> ButtonInputTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "button",
        "submit",
        "reset",
        "image"
    };

    /// <inheritdoc />
    public string Id => "unlabeled-button";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var labelForIds = AccessibleNameUtilities.CollectLabelForIds(context.Content);
        var labelRanges = AccessibleNameUtilities.CollectLabelRanges(context.Content);
        var elementIds = AccessibleNameUtilities.CollectElementIds(context.Content);

        foreach (Match match in ButtonRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var content = match.Groups["content"].Value;
            if (HasButtonLabel(attrs, content, elementIds, labelForIds, match.Index, labelRanges))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Button missing accessible label.", match.Value));
        }

        foreach (Match match in InputRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var type = AttributeParser.GetAttributeValue(attrs, "type");
            if (string.IsNullOrWhiteSpace(type) || !ButtonInputTypes.Contains(type))
            {
                continue;
            }

            if (HasInputButtonLabel(attrs, type, elementIds, labelForIds, match.Index, labelRanges))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Button missing accessible label.", match.Value));
        }

        return issues;
    }

    private static bool HasButtonLabel(
        string attributes,
        string content,
        HashSet<string> elementIds,
        HashSet<string> labelForIds,
        int index,
        IReadOnlyList<(int Start, int End)> labelRanges)
    {
        var ariaLabel = AttributeParser.GetAttributeValue(attributes, "aria-label");
        if (AccessibleNameUtilities.HasAriaLabel(ariaLabel))
        {
            return true;
        }

        var ariaLabelledBy = AttributeParser.GetAttributeValue(attributes, "aria-labelledby");
        if (AccessibleNameUtilities.HasValidAriaLabelledBy(ariaLabelledBy, elementIds))
        {
            return true;
        }

        var title = AttributeParser.GetAttributeValue(attributes, "title");
        if (AccessibleNameUtilities.HasTitle(title))
        {
            return true;
        }

        var id = AttributeParser.GetAttributeValue(attributes, "id");
        if (AccessibleNameUtilities.HasLabelForId(id, labelForIds))
        {
            return true;
        }

        if (AccessibleNameUtilities.IsWithinLabel(index, labelRanges))
        {
            return true;
        }

        return AccessibleNameUtilities.HasTextContent(content);
    }

    private static bool HasInputButtonLabel(
        string attributes,
        string type,
        HashSet<string> elementIds,
        HashSet<string> labelForIds,
        int index,
        IReadOnlyList<(int Start, int End)> labelRanges)
    {
        if (string.Equals(type, "image", StringComparison.OrdinalIgnoreCase))
        {
            var alt = AttributeParser.GetAttributeValue(attributes, "alt");
            if (!string.IsNullOrWhiteSpace(alt))
            {
                return true;
            }
        }
        else
        {
            var value = AttributeParser.GetAttributeValue(attributes, "value");
            if (!string.IsNullOrWhiteSpace(value))
            {
                return true;
            }
        }

        var ariaLabel = AttributeParser.GetAttributeValue(attributes, "aria-label");
        if (AccessibleNameUtilities.HasAriaLabel(ariaLabel))
        {
            return true;
        }

        var ariaLabelledBy = AttributeParser.GetAttributeValue(attributes, "aria-labelledby");
        if (AccessibleNameUtilities.HasValidAriaLabelledBy(ariaLabelledBy, elementIds))
        {
            return true;
        }

        var title = AttributeParser.GetAttributeValue(attributes, "title");
        if (AccessibleNameUtilities.HasTitle(title))
        {
            return true;
        }

        var id = AttributeParser.GetAttributeValue(attributes, "id");
        if (AccessibleNameUtilities.HasLabelForId(id, labelForIds))
        {
            return true;
        }

        return AccessibleNameUtilities.IsWithinLabel(index, labelRanges);
    }
}
