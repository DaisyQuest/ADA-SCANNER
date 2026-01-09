namespace Scanner.Core.Checks;

/// <summary>
/// Provides helpers for parsing colors and calculating contrast ratios.
/// </summary>
public static class ColorContrastAnalyzer
{
    private static readonly Dictionary<string, (double r, double g, double b)> NamedColors = new(StringComparer.OrdinalIgnoreCase)
    {
        ["black"] = (0, 0, 0),
        ["white"] = (1, 1, 1),
        ["red"] = (1, 0, 0),
        ["green"] = (0, 0.5, 0),
        ["blue"] = (0, 0, 1),
        ["gray"] = (0.5, 0.5, 0.5),
        ["grey"] = (0.5, 0.5, 0.5),
        ["yellow"] = (1, 1, 0),
        ["cyan"] = (0, 1, 1),
        ["magenta"] = (1, 0, 1),
        ["purple"] = (0.5, 0, 0.5),
        ["orange"] = (1, 0.647, 0),
        ["pink"] = (1, 0.753, 0.796),
        ["brown"] = (0.647, 0.165, 0.165)
    };

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

        if (trimmed.Length == 3)
        {
            trimmed = string.Concat(trimmed.Select(c => $"{c}{c}"));
        }
        else if (trimmed.Length == 4)
        {
            trimmed = string.Concat(trimmed.Skip(1).Select(c => $"{c}{c}"));
        }
        else if (trimmed.Length == 8)
        {
            trimmed = trimmed[2..];
        }
        else if (trimmed.Length != 6)
        {
            return false;
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
    /// Attempts to parse a CSS or XAML color value into normalized RGB values.
    /// </summary>
    /// <param name="value">Color value string.</param>
    /// <param name="color">The parsed normalized RGB values.</param>
    /// <returns>True when parsing succeeds and the color is fully opaque; otherwise, false.</returns>
    public static bool TryParseColor(string value, out (double r, double g, double b) color)
    {
        color = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();
        if (trimmed.Equals("transparent", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (trimmed.Contains("gradient(", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (trimmed.StartsWith("#", StringComparison.Ordinal))
        {
            return TryParseHexWithAlpha(trimmed, out color);
        }

        if (TryParseRgbFunction(trimmed, out color))
        {
            return true;
        }

        if (NamedColors.TryGetValue(trimmed, out color))
        {
            return true;
        }

        return false;
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

    private static bool TryParseHexWithAlpha(string value, out (double r, double g, double b) color)
    {
        color = default;
        var trimmed = value.TrimStart('#');
        if (trimmed.Length == 4)
        {
            var expanded = string.Concat(trimmed.Select(c => $"{c}{c}"));
            var alphaFirst = expanded[..2];
            var alphaLast = expanded[^2..];
            if (alphaFirst.Equals("ff", StringComparison.OrdinalIgnoreCase))
            {
                return TryParseHex($"#{expanded[2..]}", out color);
            }

            if (alphaLast.Equals("ff", StringComparison.OrdinalIgnoreCase))
            {
                return TryParseHex($"#{expanded[..6]}", out color);
            }

            return false;
        }

        if (trimmed.Length == 8)
        {
            var alphaFirst = trimmed[..2];
            var alphaLast = trimmed[^2..];
            if (alphaFirst.Equals("ff", StringComparison.OrdinalIgnoreCase))
            {
                return TryParseHex($"#{trimmed[2..]}", out color);
            }

            if (alphaLast.Equals("ff", StringComparison.OrdinalIgnoreCase))
            {
                return TryParseHex($"#{trimmed[..6]}", out color);
            }

            return false;
        }

        return TryParseHex(value, out color);
    }

    private static bool TryParseRgbFunction(string value, out (double r, double g, double b) color)
    {
        color = default;
        if (!value.StartsWith("rgb", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var start = value.IndexOf('(');
        var end = value.LastIndexOf(')');
        if (start < 0 || end <= start)
        {
            return false;
        }

        var inner = value[(start + 1)..end];
        string? alphaText = null;
        var slashIndex = inner.IndexOf('/');
        if (slashIndex >= 0)
        {
            alphaText = inner[(slashIndex + 1)..].Trim();
            inner = inner[..slashIndex].Trim();
        }

        string[] parts;
        if (inner.Contains(','))
        {
            parts = inner.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }
        else
        {
            parts = inner.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }

        if (parts.Length == 4 && alphaText == null)
        {
            alphaText = parts[3];
            parts = parts[..3];
        }

        if (parts.Length != 3)
        {
            return false;
        }

        if (!TryParseRgbChannel(parts[0], out var r)
            || !TryParseRgbChannel(parts[1], out var g)
            || !TryParseRgbChannel(parts[2], out var b))
        {
            return false;
        }

        if (alphaText != null && TryParseAlpha(alphaText, out var alpha) && alpha < 1)
        {
            return false;
        }

        color = (r, g, b);
        return true;
    }

    private static bool TryParseRgbChannel(string value, out double channel)
    {
        channel = default;
        if (value.EndsWith("%", StringComparison.Ordinal))
        {
            if (!double.TryParse(value[..^1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var percent))
            {
                return false;
            }

            channel = Math.Clamp(percent, 0, 100) / 100.0;
            return true;
        }

        if (!double.TryParse(value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return false;
        }

        channel = Math.Clamp(number, 0, 255) / 255.0;
        return true;
    }

    private static bool TryParseAlpha(string value, out double alpha)
    {
        alpha = default;
        var trimmed = value.Trim();
        if (trimmed.EndsWith("%", StringComparison.Ordinal))
        {
            if (!double.TryParse(trimmed[..^1], System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var percent))
            {
                return false;
            }

            alpha = Math.Clamp(percent, 0, 100) / 100.0;
            return true;
        }

        if (!double.TryParse(trimmed, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return false;
        }

        alpha = Math.Clamp(number, 0, 1);
        return true;
    }
}
