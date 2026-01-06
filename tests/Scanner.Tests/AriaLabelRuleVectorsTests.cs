using Scanner.Core.Checks;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class AriaLabelRuleVectorsTests
{
    private static RuleDefinition Rule(string ruleId, string checkId) => new(ruleId, "desc", "medium", checkId);

    [Fact]
    public void FormControlRule_PositiveFlagsMissingLabel()
    {
        var rule = Rule("aria-labels-form-control-accessible-name", "missing-label");
        var check = new MissingLabelCheck();
        var content = "<input type=\"text\" id=\"email\">";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Single(issues);
        Assert.Equal(rule.Id, issues[0].RuleId);
    }

    [Fact]
    public void FormControlRule_NegativeAllowsExplicitLabel()
    {
        var rule = Rule("aria-labels-form-control-accessible-name", "missing-label");
        var check = new MissingLabelCheck();
        var content = "<label for=\"email\">Email</label><input type=\"text\" id=\"email\">";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void FormControlRule_BoundaryAllowsNestedLabel()
    {
        var rule = Rule("aria-labels-form-control-accessible-name", "missing-label");
        var check = new MissingLabelCheck();
        var content = "<label>Email <input type=\"text\"></label>";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InteractiveRule_PositiveFlagsMissingName()
    {
        var rule = Rule("aria-labels-interactive-accessible-name", "missing-interactive-label");
        var check = new MissingInteractiveLabelCheck();
        var content = "<button><span class=\"icon\"></span></button>";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Single(issues);
        Assert.Equal(rule.Id, issues[0].RuleId);
    }

    [Fact]
    public void InteractiveRule_NegativeAllowsVisibleText()
    {
        var rule = Rule("aria-labels-interactive-accessible-name", "missing-interactive-label");
        var check = new MissingInteractiveLabelCheck();
        var content = "<button>Continue</button>";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Empty(issues);
    }

    [Fact]
    public void InteractiveRule_BoundaryFlagsPartialAriaLabelledBy()
    {
        var rule = Rule("aria-labels-interactive-accessible-name", "missing-interactive-label");
        var check = new MissingInteractiveLabelCheck();
        var content = "<button aria-labelledby=\"missing\"></button>";

        var issues = check.Run(new CheckContext("index.html", content, "html"), rule).ToList();

        Assert.Single(issues);
    }
}
