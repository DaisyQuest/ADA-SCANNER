using Scanner.Core.Checks;
using Xunit;

namespace Scanner.Tests;

public sealed class ColorContrastAnalyzerTests
{
    [Theory]
    [InlineData("#fff")]
    [InlineData("#0f0")]
    public void TryParseHex_ExpandsThreeDigitHex(string value)
    {
        var result = ColorContrastAnalyzer.TryParseHex(value, out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }

    [Fact]
    public void TryParseHex_IgnoresAlphaOnFourDigitHex()
    {
        var result = ColorContrastAnalyzer.TryParseHex("#f0f0", out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }

    [Fact]
    public void TryParseHex_IgnoresAlphaOnEightDigitHex()
    {
        var result = ColorContrastAnalyzer.TryParseHex("#ff112233", out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }

    [Fact]
    public void TryParseHex_FailsForInvalidHex()
    {
        var result = ColorContrastAnalyzer.TryParseHex("#zzzzzz", out _);

        Assert.False(result);
    }
}
