using System.Text.Json;
using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Reporting;
using Scanner.Core.Rules;
using Scanner.Core.Runtime;

namespace Scanner.Runner;

public sealed class AdaScanRunner
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly TextWriter _output;
    private readonly TextWriter _error;
    private readonly IRuntimeDocumentSource? _runtimeSource;

    public AdaScanRunner(TextWriter output, TextWriter error, IRuntimeDocumentSource? runtimeSource = null)
    {
        _output = output;
        _error = error;
        _runtimeSource = runtimeSource;
    }

    public int Run(string[] args)
    {
        if (!RunnerArguments.TryParse(args, _error, out var parsed))
        {
            return 1;
        }

        var current = Directory.GetCurrentDirectory();
        var startDir = !string.IsNullOrWhiteSpace(parsed.StartDirectory)
            ? parsed.StartDirectory
            : current;
        var outputDir = !string.IsNullOrWhiteSpace(parsed.OutputDirectory)
            ? parsed.OutputDirectory
            : Path.Combine(current, "adareport");

        if (!Directory.Exists(startDir))
        {
            _error.WriteLine($"Start directory not found: {startDir}");
            return 1;
        }

        var rulesRoot = Path.Combine(current, "rules");
        if (!Directory.Exists(rulesRoot))
        {
            _error.WriteLine($"Rules directory not found: {rulesRoot}");
            return 1;
        }

        try
        {
            var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
            var scan = engine.Scan(new ScanOptions { Path = startDir, RulesRoot = rulesRoot });
            RuntimeScanResult? runtimeScan = null;

            if (parsed.RuntimeOptions != null)
            {
                parsed.RuntimeOptions.RulesRoot = rulesRoot;
                runtimeScan = RunRuntimeScan(parsed.RuntimeOptions);
            }

            Directory.CreateDirectory(outputDir);
            var scanPath = Path.Combine(outputDir, "scan.json");
            File.WriteAllText(scanPath, JsonSerializer.Serialize(scan, SerializerOptions));

            var generator = new ReportGenerator();
            var artifacts = generator.WriteReport(scan, outputDir, "report", runtimeScan);

            _output.WriteLine($"Scan complete. Results written to {scanPath}.");
            _output.WriteLine($"Report written to {artifacts.JsonPath}, {artifacts.HtmlPath}, {artifacts.MarkdownPath}.");
            return 0;
        }
        catch (Exception ex)
        {
            _error.WriteLine(ex.Message);
            return 1;
        }
    }

    private RuntimeScanResult? RunRuntimeScan(RuntimeScanOptions options)
    {
        try
        {
            if (_runtimeSource != null)
            {
                var engine = new RuntimeScanEngine(_runtimeSource, new RuleLoader(), CheckRegistry.Default());
                return engine.ScanAsync(options).GetAwaiter().GetResult();
            }

            using var httpClient = new HttpClient();
            var crawler = new HttpRuntimeCrawler(httpClient);
            var runtimeEngine = new RuntimeScanEngine(crawler, new RuleLoader(), CheckRegistry.Default());
            return runtimeEngine.ScanAsync(options).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            _error.WriteLine($"Runtime scan failed: {ex.Message}");
            return null;
        }
    }

    private sealed class RunnerArguments
    {
        public string? StartDirectory { get; init; }

        public string? OutputDirectory { get; init; }

        public RuntimeScanOptions? RuntimeOptions { get; init; }

        public static bool TryParse(string[] args, TextWriter error, out RunnerArguments parsed)
        {
            var positionals = new List<string>();
            var seedUrls = new List<Uri>();
            var authHeaders = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var includePatterns = new List<string>();
            var excludePatterns = new List<string>();
            var maxPages = default(int?);
            var maxBodyBytes = default(int?);
            var sampleRate = default(double?);
            var maxDepth = default(int?);
            var allowedContentTypes = new List<string>();
            var excludedContentTypes = new List<string>();
            var allowedStatusCodes = new List<int>();
            var excludedStatusCodes = new List<int>();

            for (var i = 0; i < args.Length; i++)
            {
                var arg = args[i];
                if (!arg.StartsWith("--", StringComparison.Ordinal))
                {
                    positionals.Add(arg);
                    continue;
                }

                if (i + 1 >= args.Length)
                {
                    error.WriteLine($"Missing value for {arg}.");
                    WriteUsage(error);
                    parsed = new RunnerArguments();
                    return false;
                }

                var value = args[++i];
                switch (arg)
                {
                    case "--runtime-url":
                        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
                        {
                            error.WriteLine($"Invalid runtime URL: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        seedUrls.Add(uri);
                        break;
                    case "--auth-header":
                        var parts = value.Split(':', 2);
                        if (parts.Length != 2 || string.IsNullOrWhiteSpace(parts[0]))
                        {
                            error.WriteLine($"Invalid auth header: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        authHeaders[parts[0].Trim()] = parts[1].Trim();
                        break;
                    case "--runtime-include":
                        includePatterns.Add(value);
                        break;
                    case "--runtime-exclude":
                        excludePatterns.Add(value);
                        break;
                    case "--runtime-max-pages":
                        if (!int.TryParse(value, out var maxPagesValue) || maxPagesValue <= 0)
                        {
                            error.WriteLine($"Invalid max pages value: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        maxPages = maxPagesValue;
                        break;
                    case "--runtime-max-depth":
                        if (!int.TryParse(value, out var maxDepthValue) || maxDepthValue < 0)
                        {
                            error.WriteLine($"Invalid max depth value: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        maxDepth = maxDepthValue;
                        break;
                    case "--runtime-allowed-status":
                        if (!TryParseStatusCode(value, out var allowedStatus))
                        {
                            error.WriteLine($"Invalid allowed status code: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        allowedStatusCodes.Add(allowedStatus);
                        break;
                    case "--runtime-excluded-status":
                        if (!TryParseStatusCode(value, out var excludedStatus))
                        {
                            error.WriteLine($"Invalid excluded status code: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        excludedStatusCodes.Add(excludedStatus);
                        break;
                    case "--runtime-allowed-content-type":
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            error.WriteLine("Allowed content type cannot be empty.");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        allowedContentTypes.Add(value);
                        break;
                    case "--runtime-excluded-content-type":
                        if (string.IsNullOrWhiteSpace(value))
                        {
                            error.WriteLine("Excluded content type cannot be empty.");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        excludedContentTypes.Add(value);
                        break;
                    case "--runtime-max-body-bytes":
                        if (!int.TryParse(value, out var maxBodyValue) || maxBodyValue < 0)
                        {
                            error.WriteLine($"Invalid max body bytes value: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        maxBodyBytes = maxBodyValue;
                        break;
                    case "--runtime-sample-rate":
                        if (!double.TryParse(value, out var sampleValue) || sampleValue < 0 || sampleValue > 1)
                        {
                            error.WriteLine($"Invalid sample rate value: {value}");
                            WriteUsage(error);
                            parsed = new RunnerArguments();
                            return false;
                        }

                        sampleRate = sampleValue;
                        break;
                    default:
                        error.WriteLine($"Unknown argument: {arg}");
                        WriteUsage(error);
                        parsed = new RunnerArguments();
                        return false;
                }
            }

            if (positionals.Count > 2)
            {
                error.WriteLine("Usage: run-ada-scan.exe [startDir] [outputDir] [options]");
                WriteUsage(error);
                parsed = new RunnerArguments();
                return false;
            }

            parsed = new RunnerArguments
            {
                StartDirectory = positionals.ElementAtOrDefault(0),
                OutputDirectory = positionals.ElementAtOrDefault(1),
                RuntimeOptions = seedUrls.Count == 0
                    ? null
                    : new RuntimeScanOptions
                    {
                        SeedUrls = seedUrls,
                        AuthHeaders = authHeaders,
                        IncludeUrlPatterns = includePatterns,
                        ExcludeUrlPatterns = excludePatterns,
                        MaxPages = maxPages ?? 50,
                        MaxDepth = maxDepth ?? int.MaxValue,
                        MaxBodyBytes = maxBodyBytes ?? 1024 * 1024,
                        AllowedStatusCodes = allowedStatusCodes,
                        ExcludedStatusCodes = excludedStatusCodes,
                        AllowedContentTypes = allowedContentTypes,
                        ExcludedContentTypes = excludedContentTypes,
                        SampleRate = sampleRate ?? 1.0
                    }
            };

            return true;
        }

        private static bool TryParseStatusCode(string value, out int statusCode)
        {
            if (!int.TryParse(value, out statusCode))
            {
                return false;
            }

            return statusCode >= 100 && statusCode <= 599;
        }

        private static void WriteUsage(TextWriter error)
        {
            error.WriteLine("Usage: run-ada-scan.exe [startDir] [outputDir] [options]");
            error.WriteLine("Options:");
            error.WriteLine("  --runtime-url <url>            Seed URL for runtime scanning (repeatable).");
            error.WriteLine("  --auth-header <name:value>     Auth header for runtime requests (repeatable).");
            error.WriteLine("  --runtime-include <pattern>    Regex include pattern for runtime URLs.");
            error.WriteLine("  --runtime-exclude <pattern>    Regex exclude pattern for runtime URLs.");
            error.WriteLine("  --runtime-max-pages <count>    Maximum runtime pages to crawl.");
            error.WriteLine("  --runtime-max-depth <depth>    Maximum link depth to follow from seeds.");
            error.WriteLine("  --runtime-allowed-status <n>   Allowed HTTP status code (repeatable).");
            error.WriteLine("  --runtime-excluded-status <n>  Excluded HTTP status code (repeatable).");
            error.WriteLine("  --runtime-allowed-content-type <type>  Allowed content type (repeatable).");
            error.WriteLine("  --runtime-excluded-content-type <type> Excluded content type (repeatable).");
            error.WriteLine("  --runtime-max-body-bytes <n>   Maximum bytes captured per response.");
            error.WriteLine("  --runtime-sample-rate <0-1>    Sample rate for runtime documents.");
        }
    }
}
