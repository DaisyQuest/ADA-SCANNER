using System.Text.RegularExpressions;

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
        "absolute-positioning",
        "device-dependent-event-handler",
        "empty-form-label",
        "empty-link",
        "fixed-width-layout",
        "layout-table",
        "missing-heading-structure",
        "missing-label",
        "missing-document-language",
        "unlabeled-button",
        "missing-page-title",
        "missing-table-headers",
        "missing-alt-text",
        "non-wrapping-container",
        "invalid-aria-role",
        "hidden-navigation",
        "hidden-focusable",
        "insufficient-contrast",
        "orphaned-form-label",
        "redundant-title-text",
        "xaml-missing-name"
    };

    private static readonly HashSet<string> AllowedAppliesTo = new(StringComparer.OrdinalIgnoreCase)
    {
        "xaml",
        "cshtml",
        "razor",
        "html",
        "htm",
        "css",
        "ftl"
    };

    private static readonly Regex WcagCriteriaPattern = new(@"^\d+\.\d+\.\d+$", RegexOptions.Compiled);
    private static readonly Regex ProblemTagPattern = new(@"^[a-z0-9-]+$", RegexOptions.Compiled);

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

        if (!string.IsNullOrWhiteSpace(rule.AppliesTo))
        {
            var invalidKinds = rule.AppliesTo
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(kind => kind.Trim())
                .Where(kind => !AllowedAppliesTo.Contains(kind))
                .ToArray();
            if (invalidKinds.Length > 0)
            {
                errors.Add($"Rule appliesTo contains invalid values: {string.Join(", ", invalidKinds)}.");
            }
        }

        if (!string.IsNullOrWhiteSpace(rule.WcagCriteria))
        {
            var invalidCriteria = rule.WcagCriteria
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(criteria => criteria.Trim())
                .Where(criteria => string.IsNullOrWhiteSpace(criteria) || !WcagCriteriaPattern.IsMatch(criteria))
                .ToArray();
            if (invalidCriteria.Length > 0)
            {
                errors.Add("Rule wcagCriteria must list WCAG success criteria like 1.4.3.");
            }
        }

        if (!string.IsNullOrWhiteSpace(rule.ProblemTags))
        {
            var invalidTags = rule.ProblemTags
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(tag => tag.Trim())
                .Where(tag => string.IsNullOrWhiteSpace(tag) || !ProblemTagPattern.IsMatch(tag))
                .ToArray();
            if (invalidTags.Length > 0)
            {
                errors.Add("Rule problemTags must be comma-separated slugs like document-language.");
            }
        }

        return errors;
    }
}
