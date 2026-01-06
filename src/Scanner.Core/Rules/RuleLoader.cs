using System.Text.Json;

namespace Scanner.Core.Rules;

/// <summary>
/// Loads rule definitions from per-team directories and validates them.
/// </summary>
public sealed class RuleLoader
{
    private readonly RuleSchemaValidator _validator = new();
    private static readonly HashSet<string> AllowedProperties = new(StringComparer.OrdinalIgnoreCase)
    {
        "id",
        "description",
        "severity",
        "checkId",
        "appliesTo",
        "recommendation"
    };

    private static readonly string[] RequiredProperties =
    {
        "id",
        "description",
        "severity",
        "checkId"
    };

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

                var result = LoadRuleFile(file, captureErrors: false);
                rules.Add(result.Rule);
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
        if (string.IsNullOrWhiteSpace(rulesRoot))
        {
            throw new ArgumentException("Rules root is required.", nameof(rulesRoot));
        }

        if (!Directory.Exists(rulesRoot))
        {
            throw new DirectoryNotFoundException($"Rules directory not found: {rulesRoot}");
        }

        var teamRules = new List<TeamRules>();
        var errors = new List<RuleValidationError>();
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

                var result = LoadRuleFile(file, captureErrors: true);
                rules.Add(result.Rule);
                foreach (var error in result.Errors)
                {
                    errors.Add(new RuleValidationError(teamName, result.RuleIdForError, error));
                }

                var ruleErrors = _validator.Validate(result.Rule);
                foreach (var error in ruleErrors)
                {
                    errors.Add(new RuleValidationError(teamName, result.RuleIdForError, error));
                }
            }

            teamRules.Add(new TeamRules(teamName, rules));
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
        return LoadRuleFile(path, captureErrors: false, allowJsonExceptions: true).Rule;
    }

    private RuleFileLoadResult LoadRuleFile(string path, bool captureErrors, bool allowJsonExceptions = false)
    {
        try
        {
            var extension = Path.GetExtension(path);
            if (extension.Equals(".json", StringComparison.OrdinalIgnoreCase))
            {
                var json = File.ReadAllText(path);
                if (captureErrors)
                {
                    try
                    {
                        return ParseJsonRule(json, path);
                    }
                    catch (JsonException)
                    {
                        return new RuleFileLoadResult(
                            new RuleDefinition(string.Empty, string.Empty, string.Empty, string.Empty),
                            new[] { $"Rule file {path} contains empty or invalid JSON." },
                            Path.GetFileNameWithoutExtension(path),
                            HasParseError: true);
                    }
                }

                var result = ParseJsonRule(json, path);
                if (result.HasParseError)
                {
                    throw new InvalidDataException(string.Join(" ", result.Errors));
                }

                return result;
            }

            if (extension.Equals(".yml", StringComparison.OrdinalIgnoreCase) || extension.Equals(".yaml", StringComparison.OrdinalIgnoreCase))
            {
                var result = ParseSimpleYamlRule(File.ReadAllLines(path), path);
                if (!captureErrors && result.HasParseError)
                {
                    throw new InvalidDataException(string.Join(" ", result.Errors));
                }

                return result;
            }

            throw new InvalidDataException($"Unsupported rule file format: {path}");
        }
        catch (JsonException ex) when (!allowJsonExceptions)
        {
            throw new InvalidDataException($"Rule file {path} contains empty or invalid JSON.", ex);
        }
        catch (Exception ex) when (captureErrors)
        {
            return new RuleFileLoadResult(
                new RuleDefinition(string.Empty, string.Empty, string.Empty, string.Empty),
                new[] { ex.Message },
                Path.GetFileNameWithoutExtension(path),
                HasParseError: true);
        }
    }

    private static RuleFileLoadResult ParseJsonRule(string json, string path)
    {
        var errors = new List<string>();
        JsonDocument document;
        document = JsonDocument.Parse(json);

        using (document)
        {
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                errors.Add("Rule definition must be a JSON object.");
                return new RuleFileLoadResult(
                    new RuleDefinition(string.Empty, string.Empty, string.Empty, string.Empty),
                    errors,
                    Path.GetFileNameWithoutExtension(path),
                    HasParseError: true);
            }

            var values = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in document.RootElement.EnumerateObject())
            {
                if (!AllowedProperties.Contains(property.Name))
                {
                    errors.Add($"Unknown property '{property.Name}'.");
                    continue;
                }

                if (property.Value.ValueKind == JsonValueKind.String)
                {
                    values[property.Name] = property.Value.GetString();
                }
                else
                {
                    errors.Add($"Property '{property.Name}' must be a string.");
                    values[property.Name] = null;
                }
            }

            foreach (var required in RequiredProperties)
            {
                if (!values.ContainsKey(required))
                {
                    errors.Add($"Missing required property '{required}'.");
                }
            }

            values.TryGetValue("id", out var id);
            values.TryGetValue("description", out var description);
            values.TryGetValue("severity", out var severity);
            values.TryGetValue("checkId", out var checkId);
            values.TryGetValue("appliesTo", out var appliesTo);
            values.TryGetValue("recommendation", out var recommendation);

            var rule = new RuleDefinition(
                id ?? string.Empty,
                description ?? string.Empty,
                severity ?? string.Empty,
                checkId ?? string.Empty,
                string.IsNullOrWhiteSpace(appliesTo) ? null : appliesTo,
                string.IsNullOrWhiteSpace(recommendation) ? null : recommendation);

            var ruleId = string.IsNullOrWhiteSpace(id) ? Path.GetFileNameWithoutExtension(path) : id;

            return new RuleFileLoadResult(rule, errors, ruleId, HasParseError: false);
        }
    }

    private static RuleFileLoadResult ParseSimpleYamlRule(IEnumerable<string> lines, string path)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var errors = new List<string>();
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
            if (!AllowedProperties.Contains(key))
            {
                errors.Add($"Unknown property '{key}'.");
                continue;
            }

            values[key] = value;
        }

        foreach (var required in RequiredProperties)
        {
            if (!values.ContainsKey(required))
            {
                errors.Add($"Missing required property '{required}'.");
            }
        }

        values.TryGetValue("id", out var id);
        values.TryGetValue("description", out var description);
        values.TryGetValue("severity", out var severity);
        values.TryGetValue("checkId", out var checkId);
        values.TryGetValue("appliesTo", out var appliesTo);
        values.TryGetValue("recommendation", out var recommendation);

        var rule = new RuleDefinition(
            id ?? string.Empty,
            description ?? string.Empty,
            severity ?? string.Empty,
            checkId ?? string.Empty,
            string.IsNullOrWhiteSpace(appliesTo) ? null : appliesTo,
            string.IsNullOrWhiteSpace(recommendation) ? null : recommendation);

        var ruleId = string.IsNullOrWhiteSpace(id) ? Path.GetFileNameWithoutExtension(path) : id;
        return new RuleFileLoadResult(rule, errors, ruleId, HasParseError: false);
    }

    private sealed record RuleFileLoadResult(
        RuleDefinition Rule,
        IReadOnlyList<string> Errors,
        string RuleIdForError,
        bool HasParseError);
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
