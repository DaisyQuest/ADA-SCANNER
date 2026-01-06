namespace Scanner.Core.Rules;

/// <summary>
/// Validates rule definitions against expected schema constraints.
/// </summary>
public sealed class RuleSchemaValidator
{
    private static readonly HashSet<string> AllowedSeverities = new(StringComparer.OrdinalIgnoreCase)
    {
        "low",
        "medium",
        "high"
    };

    private static readonly HashSet<string> AllowedChecks = new(StringComparer.OrdinalIgnoreCase)
    {
        "missing-label",
        "missing-interactive-label",
        "missing-alt-text",
        "invalid-aria-role",
        "hidden-navigation",
        "insufficient-contrast",
        "xaml-missing-name"
    };

    /// <summary>
    /// Validates a rule definition and returns any schema errors.
    /// </summary>
    /// <param name="rule">The rule definition to validate.</param>
    /// <returns>A list of validation error messages.</returns>
    public IReadOnlyList<string> Validate(RuleDefinition rule)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(rule.Id))
        {
            errors.Add("Rule id is required.");
        }

        if (string.IsNullOrWhiteSpace(rule.Description))
        {
            errors.Add("Rule description is required.");
        }

        if (string.IsNullOrWhiteSpace(rule.Severity) || !AllowedSeverities.Contains(rule.Severity))
        {
            errors.Add("Rule severity must be low, medium, or high.");
        }

        if (string.IsNullOrWhiteSpace(rule.CheckId) || !AllowedChecks.Contains(rule.CheckId))
        {
            errors.Add("Rule check id is invalid or missing.");
        }

        return errors;
    }
}
