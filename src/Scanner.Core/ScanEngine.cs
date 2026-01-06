using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Rules;

namespace Scanner.Core;

public sealed class ScanOptions
{
    public string Path { get; init; } = string.Empty;
    public string RulesRoot { get; init; } = string.Empty;
}

public sealed class ScanEngine
{
    private readonly ProjectDiscovery _discovery;
    private readonly RuleLoader _ruleLoader;
    private readonly CheckRegistry _checkRegistry;

    public ScanEngine(ProjectDiscovery discovery, RuleLoader ruleLoader, CheckRegistry checkRegistry)
    {
        _discovery = discovery;
        _ruleLoader = ruleLoader;
        _checkRegistry = checkRegistry;
    }

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
        var rules = _ruleLoader.LoadRules(options.RulesRoot)
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
