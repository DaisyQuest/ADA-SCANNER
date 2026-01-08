using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for title attributes that duplicate existing accessible text.
/// </summary>
public sealed class RedundantTitleTextCheck : ICheck
{
    private static readonly Regex ElementRegex = new("<(?<tag>[a-z0-9]+)(?<attrs>[^>]*)>(?<content>.*?)</\\k<tag>>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex TagRegex = new("<[^>]+>", RegexOptions.Compiled);
    private static readonly Regex WhitespaceRegex = new("\\s+", RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "redundant-title-text";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();

        foreach (Match match in ElementRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var title = AttributeParser.GetAttributeValue(attrs, "title");
            if (!AccessibleNameUtilities.HasTitle(title))
            {
                continue;
            }

            var normalizedTitle = Normalize(title!);
            if (string.IsNullOrWhiteSpace(normalizedTitle))
            {
                continue;
            }

            var ariaLabel = AttributeParser.GetAttributeValue(attrs, "aria-label");
            if (TextMatches(normalizedTitle, ariaLabel))
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Title text duplicates existing accessible text.", match.Value));
                continue;
            }

            var textContent = ExtractText(match.Groups["content"].Value);
            if (TextMatches(normalizedTitle, textContent))
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Title text duplicates existing accessible text.", match.Value));
            }
        }

        return issues;
    }

    private static string ExtractText(string content) => TagRegex.Replace(content, string.Empty);

    private static string Normalize(string value) => WhitespaceRegex.Replace(value, " ").Trim();

    private static bool TextMatches(string normalizedTitle, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return string.Equals(normalizedTitle, Normalize(value), StringComparison.OrdinalIgnoreCase);
    }
}
