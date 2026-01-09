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

    [Theory]
    [InlineData("rgb(255, 255, 255)")]
    [InlineData("rgb(100% 0% 0%)")]
    [InlineData("rgb(0 0 0 / 1)")]
    [InlineData("rgba(0,0,0,1)")]
    public void TryParseColor_ParsesRgbVariants(string value)
    {
        var result = ColorContrastAnalyzer.TryParseColor(value, out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }

    [Theory]
    [InlineData("rgba(0,0,0,0.5)")]
    [InlineData("rgb(0 0 0 / 50%)")]
    [InlineData("transparent")]
    [InlineData("linear-gradient(#000, #fff)")]
    public void TryParseColor_RejectsTransparencyAndGradients(string value)
    {
        var result = ColorContrastAnalyzer.TryParseColor(value, out _);

        Assert.False(result);
    }

    [Theory]
    [InlineData("#ff112233")]
    [InlineData("#112233ff")]
    public void TryParseColor_AllowsOpaqueHexWithAlpha(string value)
    {
        var result = ColorContrastAnalyzer.TryParseColor(value, out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }

    [Theory]
    [InlineData("#80112233")]
    [InlineData("#11223380")]
    public void TryParseColor_RejectsTransparentHex(string value)
    {
        var result = ColorContrastAnalyzer.TryParseColor(value, out _);

        Assert.False(result);
    }

    [Theory]
    [InlineData("black")]
    [InlineData("white")]
    [InlineData("orange")]
    public void TryParseColor_ParsesNamedColors(string value)
    {
        var result = ColorContrastAnalyzer.TryParseColor(value, out var color);

        Assert.True(result);
        Assert.InRange(color.r, 0, 1);
        Assert.InRange(color.g, 0, 1);
        Assert.InRange(color.b, 0, 1);
    }
}
