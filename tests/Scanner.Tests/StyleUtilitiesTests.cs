using Scanner.Core.Checks;
using Xunit;

namespace Scanner.Tests;

public sealed class StyleUtilitiesTests
{
    [Fact]
    public void GetLastPropertyValue_ReturnsNullForMissingStyle()
    {
        var value = StyleUtilities.GetLastPropertyValue(null, "width");

        Assert.Null(value);
    }

    [Fact]
    public void GetLastPropertyValue_ReturnsLastMatchingValue()
    {
        var value = StyleUtilities.GetLastPropertyValue("width 20px; width: 50%; width: 640px;", "width");

        Assert.Equal("640px", value);
    }

    [Fact]
    public void GetLastPropertyValue_IgnoresNonMatchingProperties()
    {
        var value = StyleUtilities.GetLastPropertyValue("color: red;", "width");

        Assert.Null(value);
    }

    [Fact]
    public void GetLastPropertyValue_IgnoresEmptyPropertyName()
    {
        var value = StyleUtilities.GetLastPropertyValue("width: 120px;", "");

        Assert.Null(value);
    }

    [Theory]
    [InlineData("640px", true)]
    [InlineData("12.5rem", true)]
    [InlineData("0px", false)]
    [InlineData("-12px", false)]
    [InlineData("100%", false)]
    [InlineData("auto", false)]
    [InlineData("calc(100% - 20px)", false)]
    public void IsFixedLength_DetectsFixedValues(string value, bool expected)
    {
        var result = StyleUtilities.IsFixedLength(value);

        Assert.Equal(expected, result);
    }
}
