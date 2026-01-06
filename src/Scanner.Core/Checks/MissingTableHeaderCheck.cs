using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks table elements for missing header cells.
/// </summary>
public sealed class MissingTableHeaderCheck : ICheck
{
    private static readonly Regex TableRegex = new("<table(?<attrs>[^>]*)>(?<content>.*?)</table>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex HeaderRegex = new("<th\\b", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-table-headers";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();

        foreach (Match match in TableRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var role = AttributeParser.GetAttributeValue(attrs, "role");
            if (string.Equals(role, "presentation", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "none", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var content = match.Groups["content"].Value;
            if (HeaderRegex.IsMatch(content))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Table missing header cells.", match.Value));
        }

        return issues;
    }
}
