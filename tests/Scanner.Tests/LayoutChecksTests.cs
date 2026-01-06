using Scanner.Core.Checks;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class LayoutChecksTests
{
    private static RuleDefinition Rule(string checkId) => new("rule-1", "desc", "low", checkId);

    [Fact]
    public void AbsolutePositioningCheck_FlagsHtmlFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-blocking.html"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_FlagsXamlCanvasPositioning()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("xaml-blocking.xaml"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_IgnoresRelativePositioning()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-acceptable.html"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_IgnoresXamlWithoutCanvasAttributes()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("xaml-acceptable.xaml"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_UsesStyleOverrides()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-style-overrides.html"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_FlagsRazorFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-blocking.cshtml"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void AbsolutePositioningCheck_IgnoresRazorFlexibleLayout()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-acceptable.cshtml"));
        var check = new AbsolutePositioningCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsHtmlFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-blocking.html"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsXamlWidth()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("xaml-blocking.xaml"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_IgnoresFlexibleWidths()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-acceptable.html"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsRazorFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-blocking.cshtml"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_IgnoresRazorFlexibleLayout()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-acceptable.cshtml"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_IgnoresAutoAndStarXamlWidths()
    {
        var content = "<Grid><ColumnDefinition Width=\"*\" /><TextBlock Width=\"Auto\">Text</TextBlock></Grid>";
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_UsesStyleOverrides()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-style-overrides.html"));
        var check = new FixedWidthLayoutCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_FlagsHtmlFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-blocking.html"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_FlagsXamlNoWrap()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("xaml-blocking.xaml"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_IgnoresWrapping()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("xaml-acceptable.xaml"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_IgnoresMissingTextWrapping()
    {
        var content = "<TextBlock Width=\"200\">Text</TextBlock>";
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_UsesStyleOverrides()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("html-style-overrides.html"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_FlagsRazorFixture()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-blocking.cshtml"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void NonWrappingContainerCheck_IgnoresRazorWrapping()
    {
        var content = File.ReadAllText(TestUtilities.GetLayoutFixturePath("razor-acceptable.cshtml"));
        var check = new NonWrappingContainerCheck();

        var issues = check.Run(new CheckContext("index.cshtml", content, "cshtml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void LayoutChecks_HandleNestedElements()
    {
        var content = "<div><section style=\"position: absolute;\"><span style=\"width: 320px;\">Text</span></section></div>";
        var absoluteCheck = new AbsolutePositioningCheck();
        var widthCheck = new FixedWidthLayoutCheck();

        var absoluteIssues = absoluteCheck.Run(new CheckContext("index.html", content, "html"), Rule(absoluteCheck.Id)).ToList();
        var widthIssues = widthCheck.Run(new CheckContext("index.html", content, "html"), Rule(widthCheck.Id)).ToList();

        Assert.Single(absoluteIssues);
        Assert.Single(widthIssues);
    }
}
