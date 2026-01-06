using Scanner.Core.Rules;
using System.Text.Json;
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
    public void LoadRules_IgnoresNonRuleFiles()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/contrast/readme.txt", "ignore");
        TestUtilities.WriteFile(root, "rules/contrast/rule.json", "{\"id\":\"contrast-1\",\"description\":\"Check contrast\",\"severity\":\"high\",\"checkId\":\"insufficient-contrast\"}");

        var loader = new RuleLoader();
        var teams = loader.LoadRules(Path.Combine(root, "rules"));

        Assert.Single(teams);
        Assert.Single(teams[0].Rules);
    }

    [Fact]
    public void LoadRules_ThrowsWhenRootIsMissing()
    {
        var loader = new RuleLoader();

        Assert.Throws<ArgumentException>(() => loader.LoadRules(" "));
    }

    [Fact]
    public void LoadRules_ThrowsWhenDirectoryDoesNotExist()
    {
        var loader = new RuleLoader();
        var root = Path.Combine(TestUtilities.CreateTempDirectory(), "missing");

        Assert.Throws<DirectoryNotFoundException>(() => loader.LoadRules(root));
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
    public void LoadRule_ThrowsOnUnsupportedExtension()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(root, "rules/contrast/rule.txt", "id: contrast-1");

        var loader = new RuleLoader();

        var ex = Assert.Throws<InvalidDataException>(() => loader.LoadRule(path));
        Assert.Contains("Unsupported rule file format", ex.Message);
    }

    [Fact]
    public void LoadRule_ThrowsOnInvalidJson()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(root, "rules/contrast/rule.json", "{");

        var loader = new RuleLoader();

        Assert.Throws<JsonException>(() => loader.LoadRule(path));
    }

    [Fact]
    public void LoadRule_YamlTreatsEmptyOptionalFieldsAsNull()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(root, "rules/contrast/rule.yaml", "id: contrast-1\ndescription: Check contrast\nseverity: high\ncheckId: insufficient-contrast\nappliesTo:\nrecommendation: \"\"");

        var loader = new RuleLoader();
        var rule = loader.LoadRule(path);

        Assert.Null(rule.AppliesTo);
        Assert.Null(rule.Recommendation);
    }
}
