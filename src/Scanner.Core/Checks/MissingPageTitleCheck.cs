using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Detects missing or empty HTML document titles.
/// </summary>
public sealed class MissingPageTitleCheck : ICheck
{
    private static readonly Regex TitleRegex = new("<\\s*title(?<attrs>[^>]*)>(?<content>.*?)</\\s*title\\s*>", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.Singleline);

    /// <inheritdoc />
    public string Id => "missing-page-title";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var matches = TitleRegex.Matches(context.Content);
        if (matches.Count == 0)
        {
            yield return new Issue(rule.Id, Id, context.FilePath, 1, "Document title is missing.", context.Content);
            yield break;
        }

        Match? emptyMatch = null;
        foreach (Match match in matches)
        {
            var content = match.Groups["content"].Value;
            if (!string.IsNullOrWhiteSpace(content))
            {
                yield break;
            }

            emptyMatch ??= match;
        }

        if (emptyMatch != null)
        {
            var line = TextUtilities.GetLineNumber(context.Content, emptyMatch.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "Document title is missing or empty.", emptyMatch.Value);
        }
    }
}
