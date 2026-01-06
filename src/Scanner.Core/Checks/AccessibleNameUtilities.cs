using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

internal static class AccessibleNameUtilities
{
    private static readonly Regex LabelForRegex = new("<label[^>]*for=\"(?<id>[^\"]+)\"[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LabelRangeRegex = new("<label[^>]*>.*?</label>", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);
    private static readonly Regex IdRegex = new("id\\s*=\\s*\"(?<id>[^\"]+)\"", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TagRegex = new("<[^>]+>", RegexOptions.Compiled);

    public static HashSet<string> CollectLabelForIds(string content)
        => LabelForRegex.Matches(content)
            .Select(match => match.Groups["id"].Value)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static List<(int Start, int End)> CollectLabelRanges(string content)
    {
        var ranges = new List<(int Start, int End)>();
        foreach (Match match in LabelRangeRegex.Matches(content))
        {
            ranges.Add((match.Index, match.Index + match.Length));
        }

        return ranges;
    }

    public static HashSet<string> CollectElementIds(string content)
        => IdRegex.Matches(content)
            .Select(match => match.Groups["id"].Value)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static bool IsWithinLabel(int index, IReadOnlyList<(int Start, int End)> labelRanges)
        => labelRanges.Any(range => index >= range.Start && index <= range.End);

    public static bool HasAriaLabel(string? value) => !string.IsNullOrWhiteSpace(value);

    public static bool HasValidAriaLabelledBy(string? value, HashSet<string> ids)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var tokens = value.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var token in tokens)
        {
            if (ids.Contains(token))
            {
                return true;
            }
        }

        return false;
    }

    public static bool HasTitle(string? value) => !string.IsNullOrWhiteSpace(value);

    public static bool HasLabelForId(string? id, HashSet<string> labelForIds)
        => !string.IsNullOrWhiteSpace(id) && labelForIds.Contains(id);

    public static bool HasTextContent(string content)
    {
        var text = TagRegex.Replace(content, string.Empty);
        return !string.IsNullOrWhiteSpace(text);
    }
}
