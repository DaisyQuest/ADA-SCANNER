using System.IO;
using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class ScanEngineTests
{
    [Fact]
    public void Scan_ThrowsWhenPathIsMissing()
    {
        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());

        Assert.Throws<ArgumentException>(() => engine.Scan(new ScanOptions { Path = "", RulesRoot = "rules" }));
    }

    [Fact]
    public void Scan_ThrowsWhenRulesRootIsMissing()
    {
        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());

        Assert.Throws<ArgumentException>(() => engine.Scan(new ScanOptions { Path = "path", RulesRoot = "" }));
    }

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

    [Fact]
    public void Scan_ThrowsWhenRulesAreInvalid()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        var rulesRoot = Path.Combine(root, "rules");
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"bogus\",\"checkId\":\"missing-alt-text\"}");

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());

        Assert.Throws<InvalidDataException>(() => engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot }));
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var emptyRegistryEngine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), new CheckRegistry(Array.Empty<ICheck>()));
        var result = emptyRegistryEngine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Scan_SkipsRulesForNonApplicableKinds()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "view.xaml", "<Page></Page>");
        var rulesRoot = Path.Combine(root, "rules");
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Empty(result.Issues);
    }

    [Fact]
    public void Scan_AllowsAppliesToWithWhitespaceDelimitedKinds()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        var rulesRoot = Path.Combine(root, "rules");
        TestUtilities.WriteFile(rulesRoot, "team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\",\"appliesTo\":\"  html , xaml \"}");

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = root, RulesRoot = rulesRoot });

        Assert.Single(result.Issues);
    }
}
