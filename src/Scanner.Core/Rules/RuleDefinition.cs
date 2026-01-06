namespace Scanner.Core.Rules;

/// <summary>
/// Represents a single accessibility rule definition.
/// </summary>
/// <param name="Id">The unique rule identifier.</param>
/// <param name="Description">The rule description.</param>
/// <param name="Severity">The rule severity (low, medium, high).</param>
/// <param name="CheckId">The check identifier to execute.</param>
/// <param name="AppliesTo">Optional list of applicable UI kinds.</param>
/// <param name="Recommendation">Optional guidance for remediation.</param>
public sealed record RuleDefinition(
    string Id,
    string Description,
    string Severity,
    string CheckId,
    string? AppliesTo = null,
    string? Recommendation = null);

/// <summary>
/// Groups rule definitions by owning team.
/// </summary>
/// <param name="TeamName">The team folder name.</param>
/// <param name="Rules">The rules owned by the team.</param>
public sealed record TeamRules(string TeamName, IReadOnlyList<RuleDefinition> Rules);
