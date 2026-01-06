using Scanner.Core.Checks;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class ChecksTests
{
    private static RuleDefinition Rule(string checkId) => new("rule-1", "desc", "low", checkId);

    [Fact]
    public void MissingLabelCheck_FlagsInputWithoutLabel()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" id=\"name\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void MissingLabelCheck_AllowsAriaLabel()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" aria-label=\"Name\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingAltTextCheck_FlagsImage()
    {
        var check = new MissingAltTextCheck();
        var content = "<img src=\"hero.png\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InvalidAriaRoleCheck_FlagsUnknownRole()
    {
        var check = new InvalidAriaRoleCheck();
        var content = "<div role=\"fancy\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenNavigationCheck_FlagsHiddenNav()
    {
        var check = new HiddenNavigationCheck();
        var content = "<nav aria-hidden=\"true\"></nav>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsLowContrast()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#777777;background-color:#888888\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsWhenColorsMissing()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#000000\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void XamlMissingNameCheck_FlagsMissingAutomationName()
    {
        var check = new XamlMissingNameCheck();
        var content = "<Image Source=\"hero.png\"></Image>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void XamlMissingNameCheck_AllowsAutomationName()
    {
        var check = new XamlMissingNameCheck();
        var content = "<Image AutomationProperties.Name=\"Hero\" Source=\"hero.png\"></Image>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }
}
