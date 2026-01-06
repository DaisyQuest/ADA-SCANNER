using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Rules;

namespace Scanner.Core.Runtime;

/// <summary>
/// Executes runtime scans against HTML documents.
/// </summary>
public sealed class RuntimeScanEngine
{
    private readonly IRuntimeDocumentSource _documentSource;
    private readonly RuleLoader _ruleLoader;
    private readonly CheckRegistry _checkRegistry;
    private readonly RuntimeFormExtractor _formExtractor = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="RuntimeScanEngine"/> class.
    /// </summary>
    /// <param name="documentSource">The source of runtime HTML documents.</param>
    /// <param name="ruleLoader">The loader that reads rule files.</param>
    /// <param name="checkRegistry">Registry used to resolve checks for rules.</param>
    public RuntimeScanEngine(
        IRuntimeDocumentSource documentSource,
        RuleLoader ruleLoader,
        CheckRegistry checkRegistry)
    {
        _documentSource = documentSource;
        _ruleLoader = ruleLoader;
        _checkRegistry = checkRegistry;
    }

    /// <summary>
    /// Executes a runtime scan using the provided options.
    /// </summary>
    /// <param name="options">The runtime scan options.</param>
    /// <param name="cancellationToken">Token used to cancel the scan.</param>
    /// <returns>The completed runtime scan result.</returns>
    public async Task<RuntimeScanResult> ScanAsync(
        RuntimeScanOptions options,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(options.RulesRoot))
        {
            throw new ArgumentException("Rules root is required.", nameof(options));
        }

        var ruleValidation = _ruleLoader.ValidateRules(options.RulesRoot);
        if (!ruleValidation.IsValid)
        {
            var details = string.Join(" ", ruleValidation.Errors.Select(error => $"{error.Team}/{error.RuleId}: {error.Message}"));
            throw new InvalidDataException($"Rule validation failed. {details}");
        }

        var rules = ruleValidation.Teams
            .SelectMany(team => team.Rules)
            .ToList();

        var documents = new List<RuntimeHtmlDocument>();
        var issues = new List<Issue>();
        var seenDocuments = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenIssues = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        await foreach (var document in _documentSource.GetDocumentsAsync(options, cancellationToken)
                           .WithCancellation(cancellationToken))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!seenDocuments.Add(document.Url))
            {
                continue;
            }

            documents.Add(document);
            RegisterFormDefinitions(options, document);
            var context = new CheckContext(document.Url, document.Body, "html");

            foreach (var rule in rules)
            {
                var check = _checkRegistry.Find(rule.CheckId);
                if (check == null)
                {
                    continue;
                }

                if (!check.ApplicableKinds.Contains(context.Kind, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(rule.AppliesTo)
                    && !rule.AppliesTo.Split(',').Select(part => part.Trim()).Contains(context.Kind, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                foreach (var issue in check.Run(context, rule))
                {
                    if (seenIssues.Add(BuildIssueKey(issue)))
                    {
                        issues.Add(issue);
                    }
                }
            }
        }

        return new RuntimeScanResult
        {
            SeedUrls = options.SeedUrls.Select(url => url.ToString()).ToList(),
            Documents = documents,
            Issues = issues,
            Timestamp = DateTimeOffset.UtcNow,
            Forms = options.FormConfigurationStore?.Forms ?? Array.Empty<RuntimeFormConfiguration>(),
            FormConfigurationPath = options.FormConfigPath
        };
    }

    private static string BuildIssueKey(Issue issue)
    {
        return string.Join("::", issue.RuleId, issue.CheckId, issue.FilePath, issue.Line, issue.Message);
    }

    private void RegisterFormDefinitions(RuntimeScanOptions options, RuntimeHtmlDocument document)
    {
        if (options.FormConfigurationStore == null)
        {
            return;
        }

        if (!Uri.TryCreate(document.Url, UriKind.Absolute, out var uri))
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(document.ContentType)
            || !document.ContentType.Contains("html", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        var forms = _formExtractor.Extract(document.Body, uri);
        if (forms.Count == 0)
        {
            return;
        }

        options.FormConfigurationStore.RegisterDiscoveredForms(forms);

        if (!string.IsNullOrWhiteSpace(options.FormConfigPath) && options.FormConfigurationStore.IsDirty)
        {
            options.FormConfigurationStore.Save(options.FormConfigPath);
        }
    }
}
