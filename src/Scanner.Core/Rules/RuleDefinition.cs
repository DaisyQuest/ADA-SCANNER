namespace Scanner.Core.Rules;

public sealed record RuleDefinition(
    string Id,
    string Description,
    string Severity,
    string CheckId,
    string? AppliesTo = null,
    string? Recommendation = null);

public sealed record TeamRules(string TeamName, IReadOnlyList<RuleDefinition> Rules);
