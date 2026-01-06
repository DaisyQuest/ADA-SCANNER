using Xunit;

namespace Scanner.Tests;

public sealed class RuleInventoryTests
{
    [Fact]
    public void RuleInventory_ExistsAndCoversSpec008Areas()
    {
        var content = ReadRuleInventory();

        Assert.Contains("ARIA-001", content);
        Assert.Contains("CONTRAST-001", content);
        Assert.Contains("HIDDEN-NAV-001", content);
        Assert.Contains("ERROR-TOP-001", content);
        Assert.Contains("RESP-SIZE-001", content);
    }

    [Fact]
    public void RuleInventory_ListsTeamFoldersFromSpec016()
    {
        var content = ReadRuleInventory();

        Assert.Contains("rules/aria-labels/", content);
        Assert.Contains("rules/contrast/", content);
        Assert.Contains("rules/hidden-navigation-elements/", content);
        Assert.Contains("rules/error-message-at-top/", content);
        Assert.Contains("rules/responsive-size/", content);
        Assert.Contains("rules/reflow/", content);
        Assert.Contains("rules/scanner-backend/", content);
        Assert.Contains("rules/ui-frontend/", content);
        Assert.Contains("rules/report-generation/", content);
    }

    [Theory]
    [InlineData("ARIA-001")]
    [InlineData("CONTRAST-001")]
    [InlineData("HIDDEN-NAV-001")]
    [InlineData("ERROR-TOP-001")]
    [InlineData("RESP-SIZE-001")]
    [InlineData("REFLOW-001")]
    public void RuleInventory_DefinesRequiredFieldsForEachRule(string ruleId)
    {
        var content = ReadRuleInventory();
        var section = GetRuleSection(content, ruleId);

        Assert.Contains("Expected input artifacts", section);
        Assert.Contains("Detection heuristics", section);
        Assert.Contains("Expected findings shape", section);
    }

    private static string ReadRuleInventory()
    {
        var root = FindRepositoryRoot();
        var path = Path.Combine(root, "rules", "RuleInventory.md");

        Assert.True(File.Exists(path), $"Expected Rule Inventory at {path}.");

        return File.ReadAllText(path);
    }

    private static string FindRepositoryRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);

        while (current != null && !File.Exists(Path.Combine(current.FullName, "PROJECT_SPEC.md")))
        {
            current = current.Parent;
        }

        if (current == null)
        {
            throw new DirectoryNotFoundException("Unable to locate repository root containing PROJECT_SPEC.md.");
        }

        return current.FullName;
    }

    private static string GetRuleSection(string content, string ruleId)
    {
        var header = $"### {ruleId}";
        var start = content.IndexOf(header, StringComparison.Ordinal);

        if (start < 0)
        {
            throw new InvalidOperationException($"Rule section {ruleId} not found.");
        }

        var next = content.IndexOf("### ", start + header.Length, StringComparison.Ordinal);
        var length = next < 0 ? content.Length - start : next - start;

        return content.Substring(start, length);
    }
}
