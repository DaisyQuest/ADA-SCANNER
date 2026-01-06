using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

public static class AttributeParser
{
    private static readonly Regex AttributeRegex = new("(?<name>[a-zA-Z0-9:-]+)\\s*=\\s*\"(?<value>[^\"]*)\"", RegexOptions.Compiled);

    public static string? GetAttributeValue(string attributes, string name)
    {
        foreach (Match match in AttributeRegex.Matches(attributes))
        {
            if (match.Groups["name"].Value.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                return match.Groups["value"].Value;
            }
        }

        return null;
    }
}
