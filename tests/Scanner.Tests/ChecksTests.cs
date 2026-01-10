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
        var content = "<span id=\"name-label\">Name</span><input type=\"text\" aria-labelledby=\"missing name-label\">";
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
    public void MissingLabelCheck_AllowsNestedLabel()
    {
        var check = new MissingLabelCheck();
        var content = "<label>Name <input type=\"text\"></label>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingLabelCheck_AllowsAriaLabelledByWithMatchingId()
    {
        var check = new MissingLabelCheck();
        var content = "<span id=\"name-label\">Name</span><input type=\"text\" aria-labelledby=\"name-label\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingLabelCheck_FlagsAriaLabelledByWithoutMatchingId()
    {
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" aria-labelledby=\"missing-label\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void EmptyFormLabelCheck_FlagsLabelWithoutContent()
    {
        var check = new EmptyFormLabelCheck();
        var content = "<label for=\"name\"></label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void EmptyFormLabelCheck_AllowsLabelWithText()
    {
        var check = new EmptyFormLabelCheck();
        var content = "<label for=\"name\">Name</label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyFormLabelCheck_AllowsLabelWithAriaLabel()
    {
        var check = new EmptyFormLabelCheck();
        var content = "<label for=\"name\" aria-label=\"Name\"></label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyFormLabelCheck_AllowsLabelWithAriaLabelledBy()
    {
        var check = new EmptyFormLabelCheck();
        var content = "<span id=\"label\">Name</span><label for=\"name\" aria-labelledby=\"label\"></label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyFormLabelCheck_AllowsLabelWithTitle()
    {
        var check = new EmptyFormLabelCheck();
        var content = "<label for=\"name\" title=\"Name\"></label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void OrphanedFormLabelCheck_FlagsMissingControl()
    {
        var check = new OrphanedFormLabelCheck();
        var content = "<label for=\"missing\">Name</label>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void OrphanedFormLabelCheck_AllowsMatchingControl()
    {
        var check = new OrphanedFormLabelCheck();
        var content = "<label for=\"name\">Name</label><input id=\"name\" type=\"text\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void OrphanedFormLabelCheck_SkipsBlankForValues()
    {
        var check = new OrphanedFormLabelCheck();
        var content = "<label for=\" \">Name</label>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_FlagsAnchorWithoutText()
    {
        var check = new EmptyLinkCheck();
        var content = "<a href=\"/home\"></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void EmptyLinkCheck_AllowsLinkWithText()
    {
        var check = new EmptyLinkCheck();
        var content = "<a href=\"/home\">Home</a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_AllowsLinkWithAriaLabel()
    {
        var check = new EmptyLinkCheck();
        var content = "<a href=\"/home\" aria-label=\"Home\"></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_AllowsLinkWithAriaLabelledBy()
    {
        var check = new EmptyLinkCheck();
        var content = "<span id=\"home\">Home</span><a href=\"/home\" aria-labelledby=\"home\"></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_AllowsLinkWithTitle()
    {
        var check = new EmptyLinkCheck();
        var content = "<a href=\"/home\" title=\"Home\"></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_SkipsAnchorsWithoutLinkBehavior()
    {
        var check = new EmptyLinkCheck();
        var content = "<a></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void EmptyLinkCheck_FlagsRoleLinkWithoutText()
    {
        var check = new EmptyLinkCheck();
        var content = "<a role=\"link\"></a>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void MissingHeadingStructureCheck_FlagsMissingHeadings()
    {
        var check = new MissingHeadingStructureCheck();
        var content = "<main><p>Content</p></main>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void MissingHeadingStructureCheck_AllowsHeadings()
    {
        var check = new MissingHeadingStructureCheck();
        var content = "<main><h2>Section</h2></main>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void DeviceDependentEventHandlerCheck_FlagsMouseClickWithoutKeyboard()
    {
        var check = new DeviceDependentEventHandlerCheck();
        var content = "<div onclick=\"go()\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void DeviceDependentEventHandlerCheck_AllowsMouseClickWithKeyboard()
    {
        var check = new DeviceDependentEventHandlerCheck();
        var content = "<div onclick=\"go()\" onkeydown=\"go()\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void DeviceDependentEventHandlerCheck_FlagsMouseHoverWithoutFocus()
    {
        var check = new DeviceDependentEventHandlerCheck();
        var content = "<div onmouseover=\"show()\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void DeviceDependentEventHandlerCheck_AllowsMouseHoverWithFocus()
    {
        var check = new DeviceDependentEventHandlerCheck();
        var content = "<div onmouseover=\"show()\" onfocus=\"show()\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void RedundantTitleTextCheck_FlagsTitleMatchingAriaLabel()
    {
        var check = new RedundantTitleTextCheck();
        var content = "<span title=\"Info\" aria-label=\"Info\"></span>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void RedundantTitleTextCheck_FlagsTitleMatchingTextContent()
    {
        var check = new RedundantTitleTextCheck();
        var content = "<button title=\"Save\">Save</button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void RedundantTitleTextCheck_AllowsDistinctTitle()
    {
        var check = new RedundantTitleTextCheck();
        var content = "<button title=\"Save changes\">Save</button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void RedundantTitleTextCheck_SkipsWhitespaceTitle()
    {
        var check = new RedundantTitleTextCheck();
        var content = "<span title=\" \">Info</span>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void LayoutTableCheck_FlagsTableWithoutHeadersOrCaption()
    {
        var check = new LayoutTableCheck();
        var content = "<table><tr><td>Cell</td></tr></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void LayoutTableCheck_AllowsTableWithHeaders()
    {
        var check = new LayoutTableCheck();
        var content = "<table><tr><th>Header</th></tr></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void LayoutTableCheck_AllowsTableWithCaption()
    {
        var check = new LayoutTableCheck();
        var content = "<table><caption>Data</caption><tr><td>Cell</td></tr></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void LayoutTableCheck_SkipsPresentationRole()
    {
        var check = new LayoutTableCheck();
        var content = "<table role=\"presentation\"><tr><td>Layout</td></tr></table>";
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
    public void MissingDocumentLanguageCheck_FlagsMissingLang()
    {
        var check = new MissingDocumentLanguageCheck();
        var content = "<html><head></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Document language is missing or empty.", issues[0].Message);
    }

    [Fact]
    public void MissingDocumentLanguageCheck_AllowsLang()
    {
        var check = new MissingDocumentLanguageCheck();
        var content = "<html lang=\"en\"><head></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingDocumentLanguageCheck_AllowsXmlLang()
    {
        var check = new MissingDocumentLanguageCheck();
        var content = "<html xml:lang=\"en\"><head></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingDocumentLanguageCheck_SkipsWhenNoHtmlTag()
    {
        var check = new MissingDocumentLanguageCheck();
        var content = "<section><p>Partial</p></section>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingPageTitleCheck_FlagsMissingTitle()
    {
        var check = new MissingPageTitleCheck();
        var content = "<html><head></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Document title is missing.", issues[0].Message);
    }

    [Fact]
    public void MissingPageTitleCheck_FlagsWhitespaceTitle()
    {
        var check = new MissingPageTitleCheck();
        var content = "<html><head><title>   </title></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Document title is missing or empty.", issues[0].Message);
    }

    [Fact]
    public void MissingPageTitleCheck_AllowsNonEmptyTitle()
    {
        var check = new MissingPageTitleCheck();
        var content = "<html><head><title>Home</title></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingPageTitleCheck_AllowsMultipleTitlesWhenOneHasContent()
    {
        var check = new MissingPageTitleCheck();
        var content = "<html><head><title> </title><title>Dashboard</title></head><body>Content</body></html>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
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
    public void FixedWidthLayoutCheck_FlagsInlineStyleWidth()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<div style=\"width: 200px\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Element uses fixed width (width: 200px).", issues[0].Message);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsInlineStyleMinWidth()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<div style=\"min-width: 40rem\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Element uses fixed minimum width (min-width: 40rem).", issues[0].Message);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsWidthAttribute()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<table width=\"400\"></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Element uses a fixed width attribute (width=\"400\").", issues[0].Message);
    }

    [Fact]
    public void FixedWidthLayoutCheck_SkipsNonFixedMarkupWidths()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<div width=\"100%\"></div><div width=\"0\"></div><div style=\"width: auto\"></div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsXamlWidth()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<Grid Width=\"200\" />";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("XAML element uses fixed width (Width=\"200\").", issues[0].Message);
    }

    [Fact]
    public void FixedWidthLayoutCheck_FlagsXamlMinWidth()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<Grid MinWidth=\"250\" />";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("XAML element uses fixed minimum width (MinWidth=\"250\").", issues[0].Message);
    }

    [Fact]
    public void FixedWidthLayoutCheck_SkipsFlexibleXamlWidths()
    {
        var check = new FixedWidthLayoutCheck();
        var content = "<Grid Width=\"Auto\" MinWidth=\"0\" /><Grid Width=\"2*\" />";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(FixedWidthLayoutCheck.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_FlagsEmptyButton()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<button></button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Button missing accessible label.", issues[0].Message);
    }

    [Fact]
    public void UnlabeledButtonCheck_AllowsButtonText()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<button>Save</button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_AllowsAriaLabelledBy()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<span id=\"save-label\">Save</span><button aria-labelledby=\"save-label\"></button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_FlagsAriaLabelledByWithoutMatchingId()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<button aria-labelledby=\"missing\"></button>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_AllowsInputButtonValue()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<input type=\"submit\" value=\"Save\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_AllowsInputImageAlt()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<input type=\"image\" alt=\"Search\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void UnlabeledButtonCheck_FlagsInputButtonWithoutValue()
    {
        var check = new UnlabeledButtonCheck();
        var content = "<input type=\"submit\">";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
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
    public void MissingTableHeaderCheck_FlagsTableWithoutHeaders()
    {
        var check = new MissingTableHeaderCheck();
        var content = "<table><tr><td>Value</td></tr></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Equal("Table missing header cells.", issues[0].Message);
    }

    [Fact]
    public void MissingTableHeaderCheck_AllowsTableWithHeaders()
    {
        var check = new MissingTableHeaderCheck();
        var content = "<table><thead><tr><th scope=\"col\">Name</th></tr></thead></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void MissingTableHeaderCheck_AllowsPresentationTable()
    {
        var check = new MissingTableHeaderCheck();
        var content = "<table role=\"presentation\"><tr><td>Layout</td></tr></table>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsLowContrast()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#777777;background-color:#888888\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
        Assert.Contains("Foreground: rgb(119, 119, 119)", issues[0].Evidence);
        Assert.Contains("Background: rgb(136, 136, 136)", issues[0].Evidence);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsLowContrastWithSingleQuotedStyle()
    {
        var check = new InsufficientContrastCheck();
        var content = "<strong style = 'opacity: 1; color: rgb(255, 255, 255); background-color: rgb(255, 255, 255);'>Text</strong>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_AllowsSufficientContrast()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#000000;background-color:#ffffff\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
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
    public void InsufficientContrastCheck_SkipsWhenColorParsingFails()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:not-a-color;background-color:#ffffff\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_UsesCssFallbackColors()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:var(--text-color, #777777);background-color:#888888\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_StripsImportantKeyword()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#777777 !important;background-color:#888888\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsCssVariablesWithoutFallback()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:var(--text-color);background-color:#888888\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsNormalTextBelowLargeTextThreshold()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;font-size:20px\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_AllowsLargeTextAtThreeToOne()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;font-size:24px\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_AllowsBoldLargeTextAtFourteenPoint()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;font-size:19px;font-weight:bold\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsTransparentColors()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:rgba(0,0,0,0.5);background-color:#ffffff\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_ParsesBackgroundProperty()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background:#ffffff\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsGradientBackgrounds()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background:linear-gradient(#fff, #000)\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsWhenGradientMixedWithBackgroundColor()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background:#ffffff linear-gradient(#fff, #000)\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsWhenBackgroundImagePresent()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;background-image:url(hero.png)\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsWhenBackgroundImageGradientPresent()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;background-image:linear-gradient(#fff, #000)\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsWhenFilterApplied()
    {
        var check = new InsufficientContrastCheck();
        var content = "<div style=\"color:#888888;background-color:#ffffff;filter:blur(2px)\">Text</div>";
        var issues = check.Run(new CheckContext("index.html", content, "html"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsXamlForegroundBackground()
    {
        var check = new InsufficientContrastCheck();
        var content = "<TextBlock Foreground=\"#777777\" Background=\"#888888\">Text</TextBlock>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsXamlDynamicResource()
    {
        var check = new InsufficientContrastCheck();
        var content = "<TextBlock Foreground=\"{DynamicResource TextBrush}\" Background=\"#ffffff\">Text</TextBlock>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_UsesXamlFallbackValue()
    {
        var check = new InsufficientContrastCheck();
        var content = "<TextBlock Foreground=\"{Binding ThemeBrush, FallbackValue=#777777}\" Background=\"#888888\">Text</TextBlock>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsXamlWhenBackgroundMissing()
    {
        var check = new InsufficientContrastCheck();
        var content = "<TextBlock Foreground=\"#777777\">Text</TextBlock>";
        var issues = check.Run(new CheckContext("MainPage.xaml", content, "xaml"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsCssBlockWithExplicitColors()
    {
        var check = new InsufficientContrastCheck();
        var content = ".card { color: #777777; background-color: #888888; }";
        var issues = check.Run(new CheckContext("site.css", content, "css"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsCssBlocksMissingBackground()
    {
        var check = new InsufficientContrastCheck();
        var content = ".card { color: #777777; }";
        var issues = check.Run(new CheckContext("site.css", content, "css"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_SkipsCssBlocksWithUnresolvedColors()
    {
        var check = new InsufficientContrastCheck();
        var content = ".card { color: var(--text-color); background-color: #888888; }";
        var issues = check.Run(new CheckContext("site.css", content, "css"), Rule(check.Id)).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_FlagsCssBlockWithRgbColors()
    {
        var check = new InsufficientContrastCheck();
        var content = ".card { color: rgb(136, 136, 136); background: rgb(255, 255, 255); }";
        var issues = check.Run(new CheckContext("site.css", content, "css"), Rule(check.Id)).ToList();

        Assert.Single(issues);
    }

    [Fact]
    public void InsufficientContrastCheck_AllowsLargeTextInCssBlocks()
    {
        var check = new InsufficientContrastCheck();
        var content = ".card { color: #888888; background-color: #ffffff; font-size: 18pt; }";
        var issues = check.Run(new CheckContext("site.css", content, "css"), Rule(check.Id)).ToList();

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
