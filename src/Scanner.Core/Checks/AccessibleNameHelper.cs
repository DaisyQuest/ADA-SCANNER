using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

/// <summary>
/// Shared helpers for resolving accessible names in markup.
/// </summary>
public static class AccessibleNameHelper
{
    private static readonly Regex TagWithContentRegex = new(
        "<(?<tag>[a-zA-Z0-9]+)(?<attrs>[^>]*)>(?<content>.*?)</\\k<tag>>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    private static readonly Regex TagOpenRegex = new(
        "<(?<tag>[a-zA-Z0-9]+)(?<attrs>[^>]*)>",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex TagStripRegex = new("<[^>]+>", RegexOptions.Compiled);

    public static (HashSet<string> Ids, Dictionary<string, string> TextById) BuildIdIndex(string content)
    {
        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var textById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in TagWithContentRegex.Matches(content))
        {
            var attrs = match.Groups["attrs"].Value;
            var id = AttributeParser.GetAttributeValue(attrs, "id");
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            ids.Add(id);
            var text = StripTags(match.Groups["content"].Value);
            if (!string.IsNullOrWhiteSpace(text))
            {
                textById[id] = text;
            }
        }

        foreach (Match match in TagOpenRegex.Matches(content))
        {
            var attrs = match.Groups["attrs"].Value;
            var id = AttributeParser.GetAttributeValue(attrs, "id");
            if (!string.IsNullOrWhiteSpace(id))
            {
                ids.Add(id);
            }
        }

        return (ids, textById);
    }

    public static bool IsAriaLabelledByValid(string ariaLabelledBy, HashSet<string> ids, Dictionary<string, string> textById)
    {
        var references = ariaLabelledBy.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (references.Length == 0)
        {
            return false;
        }

        var hasText = false;
        foreach (var reference in references)
        {
            if (!ids.Contains(reference))
            {
                return false;
            }

            if (textById.TryGetValue(reference, out var text) && !string.IsNullOrWhiteSpace(text))
            {
                hasText = true;
            }
        }

        return hasText;
    }

    public static string StripTags(string content)
    {
        return TagStripRegex.Replace(content, string.Empty).Trim();
    }
}
