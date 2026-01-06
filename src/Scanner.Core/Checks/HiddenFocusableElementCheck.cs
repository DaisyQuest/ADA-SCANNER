using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Detects focusable or navigable elements that are hidden via HTML or XAML visibility rules.
/// </summary>
public sealed class HiddenFocusableElementCheck : ICheck
{
    private static readonly Regex TagRegex = new("<\\s*(?<closing>/)?\\s*(?<name>[a-zA-Z0-9:-]+)(?<attrs>[^>]*?)(?<self>/?)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex StyleWhitespaceRegex = new("\\s+", RegexOptions.Compiled);

    private static readonly HashSet<string> VoidElements = new(StringComparer.OrdinalIgnoreCase)
    {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr"
    };

    /// <inheritdoc />
    public string Id => "hidden-focusable";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "html", "htm", "cshtml", "razor", "xaml" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        var referencedIds = context.Kind.Equals("xaml", StringComparison.OrdinalIgnoreCase)
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : CollectReferencedIds(context.Content);

        var hiddenStack = new Stack<bool>();

        foreach (Match match in TagRegex.Matches(context.Content))
        {
            if (match.Groups["closing"].Success)
            {
                if (hiddenStack.Count > 0)
                {
                    hiddenStack.Pop();
                }

                continue;
            }

            var name = match.Groups["name"].Value;
            var attrs = match.Groups["attrs"].Value;
            var parentHidden = hiddenStack.Count > 0 && hiddenStack.Peek();
            var isHidden = parentHidden || (IsXamlContext(context) ? IsXamlHidden(attrs) : IsHtmlHidden(attrs));
            var isFocusable = IsXamlContext(context) ? IsXamlFocusable(attrs) : IsHtmlFocusable(name, attrs);
            var isReferenced = !IsXamlContext(context) && IsHtmlReferenced(attrs, referencedIds);

            if (isHidden && (isFocusable || isReferenced))
            {
                var line = TextUtilities.GetLineNumber(context.Content, match.Index);
                yield return new Issue(rule.Id, Id, context.FilePath, line, "Hidden element remains focusable or referenced by navigation.", match.Value);
            }

            if (!IsSelfClosing(match, name, context))
            {
                hiddenStack.Push(isHidden);
            }
        }
    }

    private static bool IsXamlContext(CheckContext context)
        => context.Kind.Equals("xaml", StringComparison.OrdinalIgnoreCase);

    private static bool IsSelfClosing(Match match, string name, CheckContext context)
    {
        if (match.Groups["self"].Success && match.Groups["self"].Value == "/")
        {
            return true;
        }

        return !IsXamlContext(context) && VoidElements.Contains(name);
    }

    private static bool IsHtmlHidden(string attrs)
    {
        var ariaHidden = AttributeParser.GetAttributeValue(attrs, "aria-hidden");
        var style = AttributeParser.GetAttributeValue(attrs, "style") ?? string.Empty;
        var hasHidden = TextUtilities.ContainsAttribute(attrs, "hidden", allowBoolean: true);

        return string.Equals(ariaHidden, "true", StringComparison.OrdinalIgnoreCase)
            || HasHiddenStyle(style)
            || hasHidden;
    }

    private static bool IsXamlHidden(string attrs)
    {
        var visibility = AttributeParser.GetAttributeValue(attrs, "Visibility");
        return string.Equals(visibility, "Collapsed", StringComparison.OrdinalIgnoreCase)
            || string.Equals(visibility, "Hidden", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasHiddenStyle(string style)
    {
        if (string.IsNullOrWhiteSpace(style))
        {
            return false;
        }

        var normalized = StyleWhitespaceRegex.Replace(style, string.Empty);
        return normalized.Contains("display:none", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("visibility:hidden", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsHtmlFocusable(string name, string attrs)
    {
        var tabindex = AttributeParser.GetAttributeValue(attrs, "tabindex");
        if (!string.IsNullOrWhiteSpace(tabindex))
        {
            return !IsNegativeTabIndex(tabindex);
        }

        if (TextUtilities.ContainsAttribute(attrs, "disabled", allowBoolean: true))
        {
            return false;
        }

        if (name.Equals("a", StringComparison.OrdinalIgnoreCase))
        {
            var href = AttributeParser.GetAttributeValue(attrs, "href");
            return !string.IsNullOrWhiteSpace(href);
        }

        if (name.Equals("input", StringComparison.OrdinalIgnoreCase))
        {
            var type = AttributeParser.GetAttributeValue(attrs, "type");
            return !string.Equals(type, "hidden", StringComparison.OrdinalIgnoreCase);
        }

        return name.Equals("button", StringComparison.OrdinalIgnoreCase)
            || name.Equals("select", StringComparison.OrdinalIgnoreCase)
            || name.Equals("textarea", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsXamlFocusable(string attrs)
    {
        var isTabStop = AttributeParser.GetAttributeValue(attrs, "IsTabStop");
        if (string.Equals(isTabStop, "false", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var tabIndex = AttributeParser.GetAttributeValue(attrs, "TabIndex");
        if (!string.IsNullOrWhiteSpace(tabIndex))
        {
            return !IsNegativeTabIndex(tabIndex);
        }

        return string.Equals(isTabStop, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsNegativeTabIndex(string value)
    {
        if (!int.TryParse(value, out var parsed))
        {
            return false;
        }

        return parsed < 0;
    }

    private static bool IsHtmlReferenced(string attrs, ISet<string> referencedIds)
    {
        var id = AttributeParser.GetAttributeValue(attrs, "id");
        return !string.IsNullOrWhiteSpace(id) && referencedIds.Contains(id);
    }

    private static HashSet<string> CollectReferencedIds(string content)
    {
        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in TagRegex.Matches(content))
        {
            if (match.Groups["closing"].Success)
            {
                continue;
            }

            var attrs = match.Groups["attrs"].Value;
            var href = AttributeParser.GetAttributeValue(attrs, "href");
            if (!string.IsNullOrWhiteSpace(href) && href.StartsWith("#", StringComparison.Ordinal))
            {
                ids.Add(href[1..]);
            }

            var ariaControls = AttributeParser.GetAttributeValue(attrs, "aria-controls");
            if (!string.IsNullOrWhiteSpace(ariaControls))
            {
                foreach (var id in ariaControls.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    ids.Add(id);
                }
            }
        }

        return ids;
    }
}
