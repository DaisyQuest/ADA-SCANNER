using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class ScanEngineTests
{
    [Fact]
    public void Scan_RespectsAppliesToFilter()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        var rulesRoot = Path.Combine(root, "rules");
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\",\"appliesTo\":\"xaml\"}");

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Scan_GeneratesIssuesForMatchingRules()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">" );
        var rulesRoot = Path.Combine(root, "rules");
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Single(result.Issues);
        Assert.Equal(Path.GetFullPath(root), result.ScannedPath);
    }
}
