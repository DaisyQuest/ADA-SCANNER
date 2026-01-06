using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks interactive elements for missing accessible names.
/// </summary>
public sealed class MissingInteractiveLabelCheck : ICheck
{
    private static readonly Regex ButtonRegex = new("<button(?<attrs>[^>]*)>(?<content>.*?)</button>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex AnchorRegex = new("<a(?<attrs>[^>]*)>(?<content>.*?)</a>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex RoleRegex = new("<(?<tag>[a-zA-Z0-9]+)(?<attrs>[^>]*)>(?<content>.*?)</\\k<tag>>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "missing-interactive-label";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();
        var (ids, textById) = AccessibleNameHelper.BuildIdIndex(context.Content);

        foreach (Match match in ButtonRegex.Matches(context.Content))
        {
            EvaluateMatch(match, "button", context, rule, ids, textById, issues);
        }

        foreach (Match match in AnchorRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var href = AttributeParser.GetAttributeValue(attrs, "href");
            var role = AttributeParser.GetAttributeValue(attrs, "role");
            if (string.IsNullOrWhiteSpace(href) && string.IsNullOrWhiteSpace(role))
            {
                continue;
            }

            EvaluateMatch(match, "a", context, rule, ids, textById, issues);
        }

        foreach (Match match in RoleRegex.Matches(context.Content))
        {
            var tag = match.Groups["tag"].Value;
            if (string.Equals(tag, "button", StringComparison.OrdinalIgnoreCase)
                || string.Equals(tag, "a", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var attrs = match.Groups["attrs"].Value;
            var role = AttributeParser.GetAttributeValue(attrs, "role");
            if (!IsInteractiveRole(role))
            {
                continue;
            }

            EvaluateMatch(match, tag, context, rule, ids, textById, issues);
        }

        return issues;
    }

    private static void EvaluateMatch(
        Match match,
        string tag,
        CheckContext context,
        RuleDefinition rule,
        HashSet<string> ids,
        Dictionary<string, string> textById,
        ICollection<Issue> issues)
    {
        var attrs = match.Groups["attrs"].Value;
        var ariaLabel = AttributeParser.GetAttributeValue(attrs, "aria-label");
        if (!string.IsNullOrWhiteSpace(ariaLabel))
        {
            return;
        }

        var ariaLabelledBy = AttributeParser.GetAttributeValue(attrs, "aria-labelledby");
        if (!string.IsNullOrWhiteSpace(ariaLabelledBy))
        {
            if (AccessibleNameHelper.IsAriaLabelledByValid(ariaLabelledBy, ids, textById))
            {
                return;
            }

            AddIssue(match, context, rule, issues, tag);
            return;
        }

        var textContent = AccessibleNameHelper.StripTags(match.Groups["content"].Value);
        if (!string.IsNullOrWhiteSpace(textContent))
        {
            return;
        }

        AddIssue(match, context, rule, issues, tag);
    }

    private static void AddIssue(Match match, CheckContext context, RuleDefinition rule, ICollection<Issue> issues, string tag)
    {
        var line = TextUtilities.GetLineNumber(context.Content, match.Index);
        issues.Add(new Issue(rule.Id, rule.CheckId, context.FilePath, line, $"Interactive element <{tag}> missing accessible name.", match.Value));
    }

    private static bool IsInteractiveRole(string? role)
    {
        return string.Equals(role, "button", StringComparison.OrdinalIgnoreCase)
            || string.Equals(role, "link", StringComparison.OrdinalIgnoreCase);
    }
}
