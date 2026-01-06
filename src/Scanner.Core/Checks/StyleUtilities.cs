using System.Globalization;
using System.Text.RegularExpressions;

namespace Scanner.Core.Checks;

/// <summary>
/// Helpers for parsing inline style values.
/// </summary>
public static class StyleUtilities
{
    private static readonly Regex FixedLengthRegex = new(
        "^(?<value>-?\\d+(?:\\.\\d+)?)(?<unit>px|pt|pc|cm|mm|in|em|rem)$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Gets the last value for a CSS property defined in an inline style string.
    /// </summary>
    /// <param name="style">The style attribute string.</param>
    /// <param name="propertyName">The CSS property name to find.</param>
    /// <returns>The last matching value, or null if not found.</returns>
    public static string? GetLastPropertyValue(string? style, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(style) || string.IsNullOrWhiteSpace(propertyName))
        {
            return null;
        }

        string? value = null;
        var segments = style.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var segment in segments)
        {
            var separatorIndex = segment.IndexOf(':');
            if (separatorIndex <= 0)
            {
                continue;
            }

            var name = segment[..separatorIndex].Trim();
            if (!name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var propertyValue = segment[(separatorIndex + 1)..].Trim();
            if (!string.IsNullOrWhiteSpace(propertyValue))
            {
                value = propertyValue;
            }
        }

        return value;
    }

    /// <summary>
    /// Determines whether a CSS length value is a fixed size (non-percentage).
    /// </summary>
    /// <param name="value">The CSS length value.</param>
    /// <returns>True when the value is a fixed length; otherwise, false.</returns>
    public static bool IsFixedLength(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.Equals("auto", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (trimmed.EndsWith('%'))
        {
            return false;
        }

        var match = FixedLengthRegex.Match(trimmed);
        if (!match.Success)
        {
            return false;
        }

        if (!double.TryParse(match.Groups["value"].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
        {
            return false;
        }

        return number > 0;
    }
}
