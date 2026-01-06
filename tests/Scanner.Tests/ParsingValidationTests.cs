using Scanner.Core.Checks;
using Scanner.Core.Rules;
using System.IO;
using Xunit;

namespace Scanner.Tests;

public sealed class ParsingValidationTests
{
    [Fact]
    public void AttributeParser_ReturnsValueCaseInsensitive()
    {
        var value = AttributeParser.GetAttributeValue(" aria-label=\"Name\" ", "ARIA-LABEL");

        Assert.Equal("Name", value);
    }

    [Fact]
    public void AttributeParser_ReturnsNullWhenMissing()
    {
        var value = AttributeParser.GetAttributeValue("type=\"text\"", "aria-label");

        Assert.Null(value);
    }

    [Fact]
    public void TextUtilities_ContainsAttributeRequiresEquals()
    {
        var result = TextUtilities.ContainsAttribute("disabled", "disabled");

        Assert.False(result);
    }

    [Fact]
    public void TextUtilities_ContainsAttributeAllowsBoolean()
    {
        var result = TextUtilities.ContainsAttribute("disabled", "disabled", true);

        Assert.True(result);
    }

    [Fact]
    public void TextUtilities_ContainsAttributeAllowsAssignedBoolean()
    {
        var result = TextUtilities.ContainsAttribute("hidden=\"hidden\"", "hidden", true);

        Assert.True(result);
    }

    [Fact]
    public void TextUtilities_GetLineNumberReturnsOneForZeroIndex()
    {
        var line = TextUtilities.GetLineNumber("first\nsecond", 0);

        Assert.Equal(1, line);
    }

    [Fact]
    public void TextUtilities_GetLineNumberCountsNewLines()
    {
        var line = TextUtilities.GetLineNumber("first\nsecond\nthird", 12);

        Assert.Equal(3, line);
    }

    [Fact]
    public void RuleLoader_LoadRuleThrowsForUnsupportedExtension()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(root, "rules/aria/rule.txt", "unsupported");
        var loader = new RuleLoader();

        Assert.Throws<InvalidDataException>(() => loader.LoadRule(path));
    }

    [Fact]
    public void RuleLoader_LoadRuleThrowsForNullJsonRule()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(root, "rules/aria/rule.json", "null");
        var loader = new RuleLoader();

        Assert.Throws<InvalidDataException>(() => loader.LoadRule(path));
    }

    [Fact]
    public void RuleLoader_LoadRuleParsesYamlOptionalFields()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = TestUtilities.WriteFile(
            root,
            "rules/aria/rule.yaml",
            "id: table-1\n# comment\nbad-line\ndescription: Tables\nseverity: low\ncheckId: missing-table-headers\nappliesTo: html\nrecommendation: \"Add headers\"");
        var loader = new RuleLoader();

        var rule = loader.LoadRule(path);

        Assert.Equal("table-1", rule.Id);
        Assert.Equal("html", rule.AppliesTo);
        Assert.Equal("Add headers", rule.Recommendation);
    }

    [Fact]
    public void RuleLoader_LoadRulesSkipsUnsupportedFiles()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/aria/ignore.txt", "noop");
        TestUtilities.WriteFile(root, "rules/aria/rule.json", "{\"id\":\"btn-1\",\"description\":\"Buttons\",\"severity\":\"low\",\"checkId\":\"unlabeled-button\"}");
        var loader = new RuleLoader();

        var teams = loader.LoadRules(Path.Combine(root, "rules"));

        Assert.Single(teams);
        Assert.Single(teams[0].Rules);
    }

    [Fact]
    public void RuleSchemaValidator_AllowsNewChecks()
    {
        var validator = new RuleSchemaValidator();
        var rule = new RuleDefinition("btn-1", "Buttons", "low", "unlabeled-button");

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }
}
