using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

public sealed class MissingAltTextCheck : ICheck
{
    private static readonly Regex ImgRegex = new("<img(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public string Id => "missing-alt-text";
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in ImgRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var alt = AttributeParser.GetAttributeValue(attrs, "alt");
            if (!string.IsNullOrWhiteSpace(alt))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "Image missing alt text.", match.Value);
        }
    }
}
