using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

public sealed class InvalidAriaRoleCheck : ICheck
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "banner",
        "button",
        "checkbox",
        "dialog",
        "grid",
        "link",
        "list",
        "listitem",
        "main",
        "navigation",
        "region",
        "search",
        "textbox"
    };

    private static readonly Regex RoleRegex = new("role=\"(?<role>[^\"]+)\"", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public string Id => "invalid-aria-role";
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in RoleRegex.Matches(context.Content))
        {
            var role = match.Groups["role"].Value;
            if (AllowedRoles.Contains(role))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, $"Invalid ARIA role '{role}'.", match.Value);
        }
    }
}
