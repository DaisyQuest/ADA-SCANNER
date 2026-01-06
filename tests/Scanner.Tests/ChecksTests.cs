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
    public void MissingLabelCheck_AllowsAriaLabelledBy()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" aria-labelledby=\"name-label\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingLabelCheck_FlagsEmptyAriaLabel()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" aria-label=\"\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void MissingLabelCheck_FlagsEmptyAriaLabelledBy()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" aria-labelledby=\" \">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void MissingLabelCheck_SkipsHiddenInputs()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"hidden\" id=\"secret\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingLabelCheck_AllowsMatchingLabelForAttribute()
    {
        var check = new MissingLabelCheck();
        var content = "<label for=\"name\">Name</label><input type=\"text\" id=\"name\">";
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
    public void HiddenNavigationCheck_FlagsHiddenNavWithHiddenAttribute()
    {
        var check = new HiddenNavigationCheck();
        var content = "<nav hidden></nav>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenNavigationCheck_FlagsHiddenNavWithDisplayNoneSpacing()
    {
        var check = new HiddenNavigationCheck();
        var content = "<nav style=\"display: none;\"></nav>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenNavigationCheck_FlagsHiddenNavWithVisibilityHiddenSpacing()
    {
        var check = new HiddenNavigationCheck();
        var content = "<nav style=\"visibility: hidden\"></nav>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenNavigationCheck_AllowsVisibleNav()
    {
        var check = new HiddenNavigationCheck();
        var content = "<nav aria-hidden=\"false\" style=\"display: block; visibility: visible\"></nav>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenFocusableElement()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<button style=\"display: none\">Hidden</button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenFocusableElementViaAriaHidden()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div aria-hidden=\"true\"><input type=\"text\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenFocusableElementViaVisibilityHidden()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div style=\"visibility: hidden\"><a href=\"/home\">Home</a></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsNestedHiddenContainerWithFocusableChild()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<section hidden><div><input type=\"text\"></div></section>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenTargetReferencedByNavigation()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<a href=\"#skip-target\">Skip</a><div id=\"skip-target\" style=\"display:none\">Target</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenTargetReferencedByAriaControls()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<button aria-controls=\"panel\">Toggle</button><div id=\"panel\" style=\"visibility:hidden\">Panel</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_AllowsHiddenElementRemovedFromTabOrder()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div style=\"display:none\"><button tabindex=\"-1\">Hidden</button></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_AllowsHiddenDisabledElements()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div aria-hidden=\"true\"><button disabled>Hidden</button></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_AllowsHiddenInputTypeHidden()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div style=\"display: none\"><input type=\"hidden\" id=\"token\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenTabIndexWhenNotNegative()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div style=\"display:none\"><span tabindex=\"0\">Hidden</span></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenTabIndexWithNonNumericValue()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<div style=\"display:none\"><span tabindex=\"auto\">Hidden</span></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenXamlTabStop()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<Button Visibility=\"Collapsed\" IsTabStop=\"True\" />";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_FlagsHiddenXamlTabIndexWithinHiddenContainer()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<Grid Visibility=\"Hidden\"><TextBox TabIndex=\"0\" /></Grid>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_AllowsHiddenXamlElementRemovedFromTabOrder()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<TextBox Visibility=\"Collapsed\" IsTabStop=\"False\" />";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void HiddenFocusableElementCheck_AllowsHiddenXamlElementWithNegativeTabIndex()
    {
        var check = new HiddenFocusableElementCheck();
        var content = "<StackPanel Visibility=\"Hidden\"><TextBox TabIndex=\"-1\" /></StackPanel>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
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
