using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Rules;

namespace Scanner.Core;

/// <summary>
/// Options that configure a scan run, including the target path and rules directory.
/// </summary>
public sealed class ScanOptions
{
    /// <summary>
    /// Gets the path to a solution, project, or directory to scan.
    /// </summary>
    public string Path { get; init; } = string.Empty;

    /// <summary>
    /// Gets the root directory that contains per-team rule folders.
    /// </summary>
    public string RulesRoot { get; init; } = string.Empty;
}

/// <summary>
/// Coordinates project discovery, rule loading, and checks to produce scan results.
/// </summary>
public sealed class ScanEngine
{
    private readonly ProjectDiscovery _discovery;
    private readonly RuleLoader _ruleLoader;
    private readonly CheckRegistry _checkRegistry;

    /// <summary>
    /// Initializes a new instance of the <see cref="ScanEngine"/> class.
    /// </summary>
    /// <param name="discovery">The discovery service for locating UI files.</param>
    /// <param name="ruleLoader">The loader that reads rule files.</param>
    /// <param name="checkRegistry">Registry used to resolve checks for rules.</param>
    public ScanEngine(ProjectDiscovery discovery, RuleLoader ruleLoader, CheckRegistry checkRegistry)
    {
        _discovery = discovery;
        _ruleLoader = ruleLoader;
        _checkRegistry = checkRegistry;
    }

    /// <summary>
    /// Executes a scan using the provided options.
    /// </summary>
    /// <param name="options">The scan options that provide input and rule paths.</param>
    /// <returns>The completed scan result.</returns>
    /// <exception cref="ArgumentException">Thrown when required options are missing.</exception>
    public ScanResult Scan(ScanOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Path))
        {
            throw new ArgumentException("Scan path is required.", nameof(options));
        }

        if (string.IsNullOrWhiteSpace(options.RulesRoot))
        {
            throw new ArgumentException("Rules root is required.", nameof(options));
        }

        var discoveryResult = _discovery.Discover(options.Path);
        var ruleValidation = _ruleLoader.ValidateRules(options.RulesRoot);
        if (!ruleValidation.IsValid)
        {
            var details = string.Join(" ", ruleValidation.Errors.Select(error => $"{error.Team}/{error.RuleId}: {error.Message}"));
            throw new InvalidDataException($"Rule validation failed. {details}");
        }

        var rules = ruleValidation.Teams
            .SelectMany(team => team.Rules)
            .ToList();

        var files = discoveryResult.Files;
        var issues = new List<Issue>();
        var contentCache = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var rule in rules)
        {
            var check = _checkRegistry.Find(rule.CheckId);
            if (check == null)
            {
                continue;
            }

            foreach (var file in files)
            {
                if (!check.ApplicableKinds.Contains(file.Kind, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(rule.AppliesTo)
                    && !rule.AppliesTo.Split(',').Select(part => part.Trim()).Contains(file.Kind, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!contentCache.TryGetValue(file.Path, out var content))
                {
                    content = File.ReadAllText(file.Path);
                    contentCache[file.Path] = content;
                }

                var context = new CheckContext(file.Path, content, file.Kind);
                issues.AddRange(check.Run(context, rule));
            }
        }

        return new ScanResult
        {
            ScannedPath = Path.GetFullPath(options.Path),
            Files = files,
            Issues = issues
        };
    }
}
