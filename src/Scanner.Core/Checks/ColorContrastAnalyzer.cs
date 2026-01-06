namespace Scanner.Core.Checks;

/// <summary>
/// Provides helpers for parsing colors and calculating contrast ratios.
/// </summary>
public static class ColorContrastAnalyzer
{
    /// <summary>
    /// Attempts to parse a hex color string into normalized RGB values.
    /// </summary>
    /// <param name="value">Hex color string, with or without leading '#'.</param>
    /// <param name="color">The parsed normalized RGB values.</param>
    /// <returns>True when parsing succeeds; otherwise, false.</returns>
    public static bool TryParseHex(string value, out (double r, double g, double b) color)
    {
        color = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.StartsWith("#", StringComparison.Ordinal))
        {
            trimmed = trimmed[1..];
        }

        if (trimmed.Length != 6)
        {
            return false;
        }

        if (!int.TryParse(trimmed[..2], System.Globalization.NumberStyles.HexNumber, null, out var r)
            || !int.TryParse(trimmed[2..4], System.Globalization.NumberStyles.HexNumber, null, out var g)
            || !int.TryParse(trimmed[4..6], System.Globalization.NumberStyles.HexNumber, null, out var b))
        {
            return false;
        }

        color = (r / 255.0, g / 255.0, b / 255.0);
        return true;
    }

    /// <summary>
    /// Calculates the WCAG contrast ratio for two colors.
    /// </summary>
    /// <param name="foreground">The foreground color.</param>
    /// <param name="background">The background color.</param>
    /// <returns>The contrast ratio.</returns>
    public static double ContrastRatio((double r, double g, double b) foreground, (double r, double g, double b) background)
    {
        var l1 = RelativeLuminance(foreground);
        var l2 = RelativeLuminance(background);
        var lighter = Math.Max(l1, l2);
        var darker = Math.Min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    private static double RelativeLuminance((double r, double g, double b) color)
    {
        var r = Linearize(color.r);
        var g = Linearize(color.g);
        var b = Linearize(color.b);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    private static double Linearize(double value)
    {
        return value <= 0.03928
            ? value / 12.92
            : Math.Pow((value + 0.055) / 1.055, 2.4);
    }
}
