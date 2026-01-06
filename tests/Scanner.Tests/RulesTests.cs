using Scanner.Core.Rules;
using System.Text.Json;
using Xunit;
using System.Linq;

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
    public void LoadRules_CollectsRulesAcrossTeams()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/contrast/rule.json", "{\"id\":\"contrast-1\",\"description\":\"Check contrast\",\"severity\":\"high\",\"checkId\":\"insufficient-contrast\"}");
        TestUtilities.WriteFile(root, "rules/aria/rule.json", "{\"id\":\"aria-1\",\"description\":\"Check aria\",\"severity\":\"low\",\"checkId\":\"invalid-aria-role\"}");

        var loader = new RuleLoader();
        var teams = loader.LoadRules(Path.Combine(root, "rules"));

        Assert.Equal(2, teams.Count);
        Assert.Contains(teams, team => team.TeamName == "contrast");
        Assert.Contains(teams, team => team.TeamName == "aria");
    }

    [Fact]
    public void LoadRules_ThrowsForEmptyJson()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/contrast/empty.json", "");

        var loader = new RuleLoader();

        var exception = Assert.Throws<InvalidDataException>(() => loader.LoadRules(Path.Combine(root, "rules")));
        Assert.Contains("empty or invalid", exception.Message);
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
    public void ValidateRules_ReportsMissingRequiredFields()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/forms/missing.json", "{\"id\":\"rule-1\",\"severity\":\"low\"}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Missing required property 'description'"));
        Assert.Contains(result.Errors, error => error.Message.Contains("Missing required property 'checkId'"));
        Assert.Contains(result.Errors, error => error.Message.Contains("Rule description is required."));
        Assert.Contains(result.Errors, error => error.Message.Contains("Rule check id is invalid or missing."));
    }

    [Fact]
    public void ValidateRules_ReportsInvalidFieldTypes()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/forms/types.json", "{\"id\":\"rule-2\",\"description\":\"Invalid types\",\"severity\":5,\"checkId\":false}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Property 'severity' must be a string."));
        Assert.Contains(result.Errors, error => error.Message.Contains("Property 'checkId' must be a string."));
    }

    [Fact]
    public void ValidateRules_ReportsUnknownProperties()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/forms/unknown.json", "{\"id\":\"rule-3\",\"description\":\"Unknown prop\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\",\"extra\":\"nope\"}");
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
    public void ValidateRules_AggregatesErrorsAcrossTeams()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/contrast/bad.json", "{\"id\":\"\",\"description\":\"\",\"severity\":\"low\",\"checkId\":\"insufficient-contrast\"}");
        TestUtilities.WriteFile(root, "rules/aria/bad.json", "{\"id\":\"aria-1\",\"description\":\"\",\"severity\":\"low\",\"checkId\":\"invalid-aria-role\"}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Unknown property 'extra'"));
    }

    [Fact]
    public void ValidateRules_ReportsInvalidAppliesToValues()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/forms/applies.json", "{\"id\":\"rule-4\",\"description\":\"Bad appliesTo\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\",\"appliesTo\":\"banana\"}");

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Rule appliesTo contains invalid values"));
    }

    [Fact]
    public void ValidateRules_ReportsUnknownYamlProperties()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/forms/unknown.yaml", "id: rule-5\ndescription: Unknown yaml\nseverity: low\ncheckId: missing-alt-text\nextra: nope");
        Assert.Equal(2, result.Errors.Count);
        Assert.Contains(result.Errors, error => error.Team == "contrast" && error.RuleId == "");
        Assert.Contains(result.Errors, error => error.Team == "aria" && error.RuleId == "aria-1");
    }

    [Fact]
    public void LoadRule_ThrowsForUnsupportedExtension()
    {
        var root = TestUtilities.CreateTempDirectory();
        var file = TestUtilities.WriteFile(root, "rules/contrast/rule.txt", "unsupported");

        var loader = new RuleLoader();
        var exception = Assert.Throws<InvalidDataException>(() => loader.LoadRule(file));

        Assert.Contains("Unsupported rule file format", exception.Message);
    }

    [Fact]
    public void LoadRule_ParsesYamlWithQuotesAndComments()
    {
        var root = TestUtilities.CreateTempDirectory();
        var file = TestUtilities.WriteFile(root, "rules/contrast/rule.yaml", "# comment\nid: \"contrast-1\"\ndescription: \"Contrast rule\"\nseverity: high\ncheckId: insufficient-contrast\n");

        var loader = new RuleLoader();
        var rule = loader.LoadRule(file);

        Assert.Equal("contrast-1", rule.Id);
        Assert.Equal("Contrast rule", rule.Description);
        Assert.Equal("high", rule.Severity);
        Assert.Equal("insufficient-contrast", rule.CheckId);
    }

    [Fact]
    public void LoadRule_AllowsOptionalFieldsInYaml()
    {
        var root = TestUtilities.CreateTempDirectory();
        var file = TestUtilities.WriteFile(root, "rules/contrast/rule.yaml", "id: contrast-2\ndescription: Optional fields\nseverity: medium\ncheckId: insufficient-contrast\nappliesTo: html\nrecommendation: Use compliant colors\n");

        var loader = new RuleLoader();
        var rule = loader.LoadRule(file);

        Assert.Equal("html", rule.AppliesTo);
        Assert.Equal("Use compliant colors", rule.Recommendation);
    }

    [Fact]
    public void LoadRule_TrimsEmptyOptionalFieldsInYaml()
    {
        var root = TestUtilities.CreateTempDirectory();
        var file = TestUtilities.WriteFile(root, "rules/contrast/rule.yaml", "id: contrast-3\ndescription: Optional fields\nseverity: medium\ncheckId: insufficient-contrast\nappliesTo: \"  \"\nrecommendation:\n");

        var loader = new RuleLoader();
        var rule = loader.LoadRule(file);

        Assert.Null(rule.AppliesTo);
        Assert.Null(rule.Recommendation);
    }

    [Fact]
    public void LoadRules_ThrowsWhenRulesRootMissing()
    {
        var loader = new RuleLoader();

        var exception = Assert.Throws<DirectoryNotFoundException>(() => loader.LoadRules(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"))));
        Assert.Contains("Rules directory not found", exception.Message);
    }

    [Fact]
    public void LoadRules_ThrowsWhenRulesRootIsWhitespace()
    {
        var loader = new RuleLoader();

        var exception = Assert.Throws<ArgumentException>(() => loader.LoadRules(" "));

        Assert.Contains("Rules root is required", exception.Message);
    }

    [Fact]
    public void RepositoryContrastRules_AreValid()
    {
        var root = TestUtilities.FindRepositoryRoot();

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Unknown property 'extra'"));
        Assert.True(result.IsValid);
        var contrastTeam = result.Teams.Single(team => team.TeamName == "contrast");
        Assert.Equal(12, contrastTeam.Rules.Count);
    }
}
