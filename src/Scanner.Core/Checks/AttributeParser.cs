using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

/// <summary>
/// Parses attribute values from HTML-like tag content.
/// </summary>
public static class AttributeParser
{
    private static readonly Regex AttributeRegex = new("(?<name>[a-zA-Z0-9:.-]+)\\s*=\\s*\"(?<value>[^\"]*)\"", RegexOptions.Compiled);

    /// <summary>
    /// Extracts the attribute value for the specified attribute name.
    /// </summary>
    /// <param name="attributes">The raw attribute string.</param>
    /// <param name="name">The attribute name to extract.</param>
    /// <returns>The attribute value if found; otherwise, null.</returns>
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
