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

        var loader = new RuleLoader();
        var result = loader.ValidateRules(Path.Combine(root, "rules"));

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, error => error.Message.Contains("Unknown property 'extra'"));
    }
}
