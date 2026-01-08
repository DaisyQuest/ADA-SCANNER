using System.Text.RegularExpressions;
using System.Linq;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks for mouse-specific event handlers without keyboard equivalents.
/// </summary>
public sealed class DeviceDependentEventHandlerCheck : ICheck
{
    private static readonly Regex ElementRegex = new("<(?<tag>[a-z0-9]+)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly string[] MouseClickEvents = { "onclick", "onmousedown", "onmouseup", "ondblclick" };
    private static readonly string[] MouseHoverEvents = { "onmouseover", "onmouseout", "onmouseenter", "onmouseleave" };
    private static readonly string[] KeyboardEvents = { "onkeydown", "onkeypress", "onkeyup" };
    private static readonly string[] FocusEvents = { "onfocus", "onblur" };

    /// <inheritdoc />
    public string Id => "device-dependent-event-handler";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var issues = new List<Issue>();

        foreach (Match match in ElementRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            var hasMouseClick = ContainsAny(attrs, MouseClickEvents);
            var hasMouseHover = ContainsAny(attrs, MouseHoverEvents);
            if (!hasMouseClick && !hasMouseHover)
            {
                continue;
            }

            var hasKeyboard = ContainsAny(attrs, KeyboardEvents);
            var hasFocus = ContainsAny(attrs, FocusEvents);
            if ((hasMouseClick && !hasKeyboard) || (hasMouseHover && !hasFocus))
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                issues.Add(new Issue(rule.Id, Id, context.FilePath, line, "Mouse-specific event handler lacks keyboard equivalent.", match.Value));
            }
        }

        return issues;
    }

    private static bool ContainsAny(string attributes, IEnumerable<string> names)
        => names.Any(name => TextUtilities.ContainsAttribute(attributes, name));
}
