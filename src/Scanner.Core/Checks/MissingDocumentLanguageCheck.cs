using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Detects missing language declarations on HTML documents.
/// </summary>
public sealed class MissingDocumentLanguageCheck : ICheck
{
    private static readonly Regex HtmlTagRegex = new("<\\s*html(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-document-language";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var match = HtmlTagRegex.Match(context.Content);
        if (!match.Success)
        {
            yield break;
        }

        var attrs = match.Groups["attrs"].Value;
        var lang = AttributeParser.GetAttributeValue(attrs, "lang");
        var xmlLang = AttributeParser.GetAttributeValue(attrs, "xml:lang");

        if (!string.IsNullOrWhiteSpace(lang) || !string.IsNullOrWhiteSpace(xmlLang))
        {
            yield break;
        }

        var line = TextUtilities.GetLineNumber(context.Content, match.Index);
        yield return new Issue(rule.Id, Id, context.FilePath, line, "Document language is missing or empty.", match.Value);
    }
}
