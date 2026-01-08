using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class RuleSchemaValidatorTests
{
    [Fact]
    public void Validate_ReturnsNoErrorsForValidRule()
    {
        var rule = new RuleDefinition("contrast-1", "Valid", "low", "insufficient-contrast");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_ReportsMissingFields()
    {
        var rule = new RuleDefinition("", "", "", "");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Equal(4, errors.Count);
        Assert.Contains("Rule id is required.", errors);
        Assert.Contains("Rule description is required.", errors);
        Assert.Contains("Rule severity must be low, medium, or high.", errors);
        Assert.Contains("Rule check id is invalid or missing.", errors);
    }

    [Fact]
    public void Validate_RejectsUnknownSeverityAndCheck()
    {
        var rule = new RuleDefinition("rule-1", "Bad", "critical", "unknown");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Equal(2, errors.Count);
        Assert.Contains("Rule severity must be low, medium, or high.", errors);
        Assert.Contains("Rule check id is invalid or missing.", errors);
    }

    [Fact]
    public void Validate_AllowsCaseInsensitiveSeverityAndCheck()
    {
        var rule = new RuleDefinition("rule-1", "Valid", "HIGH", "Missing-Alt-Text");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_AllowsRuntimeDocumentChecks()
    {
        var rule = new RuleDefinition("rule-2", "Lang", "high", "missing-document-language");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_AllowsNewAccessibilityChecks()
    {
        var rule = new RuleDefinition("rule-2", "Links", "medium", "empty-link");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_RejectsInvalidWcagCriteria()
    {
        var rule = new RuleDefinition(
            "rule-3",
            "Bad criteria",
            "low",
            "missing-alt-text",
            WcagCriteria: "1.4, abc");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Single(errors);
        Assert.Contains("Rule wcagCriteria must list WCAG success criteria like 1.4.3.", errors);
    }

    [Fact]
    public void Validate_AllowsValidWcagCriteriaAndProblemTags()
    {
        var rule = new RuleDefinition(
            "rule-4",
            "Valid tags",
            "low",
            "missing-alt-text",
            WcagCriteria: "1.1.1, 1.4.3",
            ProblemTags: "image-text, non-text-content");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_RejectsInvalidProblemTags()
    {
        var rule = new RuleDefinition(
            "rule-5",
            "Bad tags",
            "medium",
            "missing-alt-text",
            ProblemTags: "Image Text, ,bad");
        var validator = new RuleSchemaValidator();

        var errors = validator.Validate(rule);

        Assert.Single(errors);
        Assert.Contains("Rule problemTags must be comma-separated slugs like document-language.", errors);
    }
}
