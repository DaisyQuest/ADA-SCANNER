using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for labels that reference missing form controls.
/// </summary>
public sealed class OrphanedFormLabelCheck : ICheck
{
    private static readonly Regex LabelForRegex = new("<label[^>]*for=\"(?<id>[^\"]+)\"[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "orphaned-form-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var elementIds = AccessibleNameUtilities.CollectElementIds(context.Content);

        foreach (Match match in LabelForRegex.Matches(context.Content))
        {
            var id = match.Groups["id"].Value;
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            if (elementIds.Contains(id))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Form label references a missing control.", match.Value));
        }

        return issues;
    }
}
