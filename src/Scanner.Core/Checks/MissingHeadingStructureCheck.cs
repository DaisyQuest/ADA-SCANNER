using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for documents that do not include any heading elements.
/// </summary>
public sealed class MissingHeadingStructureCheck : ICheck
{
    private static readonly Regex HeadingRegex = new("<h[1-6][^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-heading-structure";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        if (HeadingRegex.IsMatch(context.Content))
        {
            return Array.Empty<Issue>();
        }

        var line = TextUtilities.GetLineNumber(context.Content, 0);
        return new[]
        {
            new Issue(rule.Id, Id, context.FilePath, line, "Document has no heading structure.", null)
        };
    }
}
