using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

/// <summary>
/// Helpers for analyzing text content.
/// </summary>
public static class TextUtilities
{
    /// <summary>
    /// Determines the 1-based line number for the provided character index.
    /// </summary>
    /// <param name="content">The text content to inspect.</param>
    /// <param name="index">The character index.</param>
    /// <returns>The 1-based line number.</returns>
    public static int GetLineNumber(string content, int index)
    {
        if (index <= 0)
        {
            return 1;
        }

        var line = 1;
        for (var i = 0; i < content.Length && i < index; i++)
        {
            if (content[i] == '\n')
            {
                line++;
            }
        }

        return line;
    }

    /// <summary>
    /// Checks whether an attribute exists in an attribute string.
    /// </summary>
    /// <param name="attributes">The raw attribute string.</param>
    /// <param name="attributeName">The attribute name to look for.</param>
    /// <returns>True when the attribute is present; otherwise, false.</returns>
    public static bool ContainsAttribute(string attributes, string attributeName, bool allowBoolean = false)
    {
        if (!allowBoolean)
        {
            return attributes.Contains(attributeName + "=", StringComparison.OrdinalIgnoreCase);
        }

        return Regex.IsMatch(
            attributes,
            $"(^|\\s){Regex.Escape(attributeName)}(\\s|=|$)",
            RegexOptions.IgnoreCase);
    }
}
