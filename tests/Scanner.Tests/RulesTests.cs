using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class RulesTests
{
    [Fact]
    public void LoadRules_ReadsJsonAndYaml()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/contrast/rule.json", "{\"id\":\"contrast-1\",\"description\":\"Check contrast\",\"severity\":\"high\",\"checkId\":\"insufficient-contrast\"}");
        TestUtilities.WriteFile(root, "rules/contrast/rule.yaml", "id: label-1\ndescription: Missing label\nseverity: medium\ncheckId: missing-label");

        var loader = new RuleLoader();
        var teams = loader.LoadRules(Path.Combine(root, "rules"));

        Assert.Single(teams);
        Assert.Equal("contrast", teams[0].TeamName);
        Assert.Equal(2, teams[0].Rules.Count);
    }

    [Fact]
    public void ValidateRules_ReturnsErrorsForInvalidRule()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/aria/bad.json", "{\"id\":\"\",\"description\":\"\",\"severity\":\"critical\",\"checkId\":\"unknown\"}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Equal(4, result.Errors.Count);
    }

    [Fact]
    public void ValidateRules_PassesForValidRule()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/html/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateRules_PassesForRepositoryRules()
    {
        var root = TestUtilities.FindRepositoryRoot();
        var loader = new RuleLoader();

        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
        var reflowTeam = Assert.Single(result.Teams, team => team.TeamName == "reflow");
        Assert.Equal(3, reflowTeam.Rules.Count);
    }
}
