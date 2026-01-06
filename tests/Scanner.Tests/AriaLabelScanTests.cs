using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class AriaLabelScanTests
{
    [Fact]
    public void ScanEngine_ReportsAriaLabelRulesWithLineNumbers()
    {
        var root = TestUtilities.CreateTempDirectory();
        var rulesRoot = Path.Combine(root, "rules");
        var formRulePath = "aria-labels/form-control-accessible-name.json";
        var interactiveRulePath = "aria-labels/interactive-accessible-name.json";

        TestUtilities.WriteFile(rulesRoot, formRulePath, """
            {"id":"aria-labels-form-control-accessible-name","description":"Form control accessible name","severity":"high","checkId":"missing-label"}
            """);
        TestUtilities.WriteFile(rulesRoot, interactiveRulePath, """
            {"id":"aria-labels-interactive-accessible-name","description":"Interactive accessible name","severity":"high","checkId":"missing-interactive-label"}
            """);

        var content = """
            <html>
            <body>
            <input type="text" id="email">
            <button></button>
            </body>
            </html>
            """;
        var filePath = TestUtilities.WriteFile(root, "index.html", content);

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Equal(2, result.Issues.Count);

        var formIssue = result.Issues.Single(issue => issue.RuleId == "aria-labels-form-control-accessible-name");
        Assert.Equal(filePath, formIssue.FilePath);
        Assert.Equal(3, formIssue.Line);

        var interactiveIssue = result.Issues.Single(issue => issue.RuleId == "aria-labels-interactive-accessible-name");
        Assert.Equal(filePath, interactiveIssue.FilePath);
        Assert.Equal(4, interactiveIssue.Line);
    }
}
