using System.Text.Json;

namespace Scanner.Core.Rules;

/// <summary>
/// Loads rule definitions from per-team directories and validates them.
/// </summary>
public sealed class RuleLoader
{
    private readonly RuleSchemaValidator _validator = new();

    /// <summary>
    /// Loads all rule definitions from the provided rules root.
    /// </summary>
    /// <param name="rulesRoot">Root directory containing per-team rule folders.</param>
    /// <returns>Rules grouped by team.</returns>
    /// <exception cref="ArgumentException">Thrown when the rules root is missing.</exception>
    /// <exception cref="DirectoryNotFoundException">Thrown when the rules directory is missing.</exception>
    public IReadOnlyList<TeamRules> LoadRules(string rulesRoot)
    {
        if (string.IsNullOrWhiteSpace(rulesRoot))
        {
            throw new ArgumentException("Rules root is required.", nameof(rulesRoot));
        }

        if (!Directory.Exists(rulesRoot))
        {
            throw new DirectoryNotFoundException($"Rules directory not found: {rulesRoot}");
        }

        var teamRules = new List<TeamRules>();
        foreach (var teamDirectory in Directory.EnumerateDirectories(rulesRoot))
        {
            var teamName = Path.GetFileName(teamDirectory);
            var rules = new List<RuleDefinition>();
            foreach (var file in Directory.EnumerateFiles(teamDirectory))
            {
                var extension = Path.GetExtension(file);
                if (!extension.Equals(".json", StringComparison.OrdinalIgnoreCase)
                    && !extension.Equals(".yml", StringComparison.OrdinalIgnoreCase)
                    && !extension.Equals(".yaml", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var rule = LoadRule(file);
                rules.Add(rule);
            }

            teamRules.Add(new TeamRules(teamName, rules));
        }

        return teamRules;
    }

    /// <summary>
    /// Loads and validates rules under the provided root.
    /// </summary>
    /// <param name="rulesRoot">Root directory containing per-team rule folders.</param>
    /// <returns>The validation result including any errors.</returns>
    public RuleValidationResult ValidateRules(string rulesRoot)
    {
        var teamRules = LoadRules(rulesRoot);
        var errors = new List<RuleValidationError>();
        foreach (var team in teamRules)
        {
            foreach (var rule in team.Rules)
            {
                var ruleErrors = _validator.Validate(rule);
                foreach (var error in ruleErrors)
                {
                    errors.Add(new RuleValidationError(team.TeamName, rule.Id, error));
                }
            }
        }

        return new RuleValidationResult(teamRules, errors);
    }

    /// <summary>
    /// Loads a single rule definition from a JSON or YAML file.
    /// </summary>
    /// <param name="path">The file path to the rule definition.</param>
    /// <returns>The parsed rule definition.</returns>
    /// <exception cref="InvalidDataException">Thrown when the rule file cannot be parsed.</exception>
    public RuleDefinition LoadRule(string path)
    {
        var extension = Path.GetExtension(path);
        if (extension.Equals(".json", StringComparison.OrdinalIgnoreCase))
        {
            var json = File.ReadAllText(path);
            var rule = JsonSerializer.Deserialize<RuleDefinition>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
            if (rule == null)
            {
                throw new InvalidDataException($"Rule file {path} is empty or invalid.");
            }

            return rule;
        }

        if (extension.Equals(".yml", StringComparison.OrdinalIgnoreCase) || extension.Equals(".yaml", StringComparison.OrdinalIgnoreCase))
        {
            return ParseSimpleYamlRule(File.ReadAllLines(path));
        }

        throw new InvalidDataException($"Unsupported rule file format: {path}");
    }

    private static RuleDefinition ParseSimpleYamlRule(IEnumerable<string> lines)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#", StringComparison.Ordinal))
            {
                continue;
            }

            var index = trimmed.IndexOf(':');
            if (index <= 0)
            {
                continue;
            }

            var key = trimmed[..index].Trim();
            var value = trimmed[(index + 1)..].Trim().Trim('"');
            values[key] = value;
        }

        values.TryGetValue("id", out var id);
        values.TryGetValue("description", out var description);
        values.TryGetValue("severity", out var severity);
        values.TryGetValue("checkId", out var checkId);
        values.TryGetValue("appliesTo", out var appliesTo);
        values.TryGetValue("recommendation", out var recommendation);

        return new RuleDefinition(
            id ?? string.Empty,
            description ?? string.Empty,
            severity ?? string.Empty,
            checkId ?? string.Empty,
            string.IsNullOrWhiteSpace(appliesTo) ? null : appliesTo,
            string.IsNullOrWhiteSpace(recommendation) ? null : recommendation);
    }
}

/// <summary>
/// Captures a validation error for a specific rule.
/// </summary>
/// <param name="Team">The owning team.</param>
/// <param name="RuleId">The rule identifier.</param>
/// <param name="Message">The validation error message.</param>
public sealed record RuleValidationError(string Team, string RuleId, string Message);

/// <summary>
/// Summarizes rule validation results.
/// </summary>
/// <param name="Teams">The loaded team rules.</param>
/// <param name="Errors">The validation errors.</param>
public sealed record RuleValidationResult(IReadOnlyList<TeamRules> Teams, IReadOnlyList<RuleValidationError> Errors)
{
    /// <summary>
    /// Gets a value indicating whether the validation completed with no errors.
    /// </summary>
    public bool IsValid => Errors.Count == 0;
}
