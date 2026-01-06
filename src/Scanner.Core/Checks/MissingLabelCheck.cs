using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks form controls for missing accessible labels.
/// </summary>
public sealed class MissingLabelCheck : ICheck
{
    private static readonly Regex InputRegex = new("<(input|select|textarea)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LabelRegex = new("<label[^>]*for=\"(?<id>[^\"]+)\"[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var labels = LabelRegex.Matches(context.Content).Select(match => match.Groups["id"].Value).ToHashSet(StringComparer.OrdinalIgnoreCase);

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
                continue;
            }

            var id = AttributeParser.GetAttributeValue(attrs, "id");
            if (!string.IsNullOrWhiteSpace(id) && labels.Contains(id))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Form control missing accessible label.", match.Value));
        }

        return issues;
    }
}
