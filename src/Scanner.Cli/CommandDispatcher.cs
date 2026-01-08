using System.Text.Json;
using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Reporting;
using Scanner.Core.Rules;
using Scanner.Core.Runtime;

namespace Scanner.Cli;

public sealed class CommandDispatcher
{
    private readonly CommandLineParser _parser = new();
    private readonly IRuntimeDocumentSource? _runtimeSource;

    public CommandDispatcher(IRuntimeDocumentSource? runtimeSource = null)
    {
        _runtimeSource = runtimeSource;
    }

    public int Dispatch(string[] args, IConsole console)
    {
        if (args.Length == 0)
        {
            console.WriteError("No command provided.");
            return 1;
        }

        var command = args[0];
        return command switch
        {
            "scan" => HandleScan(args, console),
            "rules" => HandleRules(args, console),
            "report" => HandleReport(args, console),
            "export" => HandleExport(args, console),
            _ => HandleUnknown(command, console)
        };
    }

    private int HandleScan(string[] args, IConsole console)
    {
        var optionsResult = _parser.ParseOptions(args, 1);
        if (!optionsResult.IsSuccess)
        {
            console.WriteError(optionsResult.Error ?? "Invalid options.");
            return 1;
        }

        var options = optionsResult.Options;
        if (!optionsResult.Options.TryGetValue("path", out var path) || string.IsNullOrWhiteSpace(path))
        {
            console.WriteError("Missing --path for scan command.");
            return 1;
        }

        if (!options.TryGetValue("rules", out var rulesRoot) || string.IsNullOrWhiteSpace(rulesRoot))
        {
            console.WriteError("Missing --rules for scan command.");
            return 1;
        }

        var outputDir = options.TryGetValue("out", out var outDir) && !string.IsNullOrWhiteSpace(outDir)
            ? outDir
            : Path.Combine(Directory.GetCurrentDirectory(), "artifacts");

        var reportBaseProvided = options.TryGetValue("report-base", out var reportBaseName);
        if (reportBaseProvided && string.IsNullOrWhiteSpace(reportBaseName))
        {
            console.WriteError("Missing --report-base for scan command.");
            return 1;
        }

        var reportOutProvided = options.TryGetValue("report-out", out var reportOutDir);
        if (reportOutProvided && string.IsNullOrWhiteSpace(reportOutDir))
        {
            console.WriteError("Missing --report-out for scan command.");
            return 1;
        }

        if (reportBaseProvided && !reportOutProvided)
        {
            console.WriteError("Cannot use --report-base without --report-out.");
            return 1;
        }

        if (!TryBuildRuntimeCaptureOptions(options, rulesRoot, out var runtimeOptions, out var runtimeError))
        {
            console.WriteError(runtimeError ?? "Invalid runtime options.");
            return 1;
        }

        var scanEngine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = scanEngine.Scan(new ScanOptions { Path = path, RulesRoot = rulesRoot });
        RuntimeScanResult? runtimeScan = null;
        if (runtimeOptions != null)
        {
            runtimeScan = RunRuntimeCapture(runtimeOptions, console);
        }

        Directory.CreateDirectory(outputDir);
        var outputPath = Path.Combine(outputDir, "scan.json");
        File.WriteAllText(outputPath, JsonSerializer.Serialize(result, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        }));

        console.WriteLine($"Scan complete. Results written to {outputPath}.");

        if (reportOutProvided)
        {
            var generator = new ReportGenerator();
            var reportArtifacts = generator.WriteReport(result, reportOutDir!, reportBaseName ?? "report", runtimeScan);
            console.WriteLine($"Report written to {reportArtifacts.JsonPath}, {reportArtifacts.HtmlPath}, {reportArtifacts.MarkdownPath}.");
        }

        return 0;
    }

    private RuntimeScanResult? RunRuntimeCapture(RuntimeScanOptions options, IConsole console)
    {
        try
        {
            var source = _runtimeSource ?? new RuntimeCaptureListener();
            var runtimeEngine = new RuntimeScanEngine(source, new RuleLoader(), CheckRegistry.Default());
            return runtimeEngine.ScanAsync(options).GetAwaiter().GetResult();
        }
        catch (Exception ex)
        {
            console.WriteError($"Runtime scan failed: {ex.Message}");
            return null;
        }
    }

    private static bool TryBuildRuntimeCaptureOptions(
        IReadOnlyDictionary<string, string> options,
        string rulesRoot,
        out RuntimeScanOptions? runtimeOptions,
        out string? errorMessage)
    {
        runtimeOptions = null;
        errorMessage = null;

        if (!TryGetOptionalInt(options, "runtime-capture-port", out var capturePort, out errorMessage)
            || !TryGetOptionalInt(options, "runtime-capture-max-docs", out var captureMaxDocs, out errorMessage)
            || !TryGetOptionalInt(options, "runtime-capture-idle-seconds", out var captureIdleSeconds, out errorMessage)
            || !TryGetOptionalInt(options, "runtime-max-body-bytes", out var maxBodyBytes, out errorMessage)
            || !TryGetOptionalDouble(options, "runtime-sample-rate", out var sampleRate, out errorMessage))
        {
            return false;
        }

        var capturePath = GetOptionalString(options, "runtime-capture-path");
        var captureToken = GetOptionalString(options, "runtime-capture-token");

        var hasCaptureSettings = !string.IsNullOrWhiteSpace(capturePath)
            || !string.IsNullOrWhiteSpace(captureToken)
            || captureMaxDocs.HasValue
            || captureIdleSeconds.HasValue
            || maxBodyBytes.HasValue
            || sampleRate.HasValue;

        if (!capturePort.HasValue && !hasCaptureSettings)
        {
            return true;
        }

        if (!capturePort.HasValue)
        {
            errorMessage = "Runtime capture port is required when capture settings are provided.";
            return false;
        }

        if (capturePort <= 0 || capturePort > 65535)
        {
            errorMessage = $"Invalid runtime capture port: {capturePort}";
            return false;
        }

        if (captureMaxDocs.HasValue && captureMaxDocs <= 0)
        {
            errorMessage = $"Invalid runtime capture max docs: {captureMaxDocs}";
            return false;
        }

        if (captureIdleSeconds.HasValue && captureIdleSeconds <= 0)
        {
            errorMessage = $"Invalid runtime capture idle seconds: {captureIdleSeconds}";
            return false;
        }

        if (maxBodyBytes.HasValue && maxBodyBytes < 0)
        {
            errorMessage = $"Invalid runtime max body bytes: {maxBodyBytes}";
            return false;
        }

        if (sampleRate.HasValue && (sampleRate < 0 || sampleRate > 1))
        {
            errorMessage = $"Invalid runtime sample rate: {sampleRate}";
            return false;
        }

        runtimeOptions = new RuntimeScanOptions
        {
            RulesRoot = rulesRoot,
            MaxBodyBytes = maxBodyBytes ?? 1024 * 1024,
            SampleRate = sampleRate ?? 1.0,
            CaptureOptions = new RuntimeCaptureOptions
            {
                Port = capturePort.Value,
                Path = capturePath ?? "/capture",
                AccessToken = captureToken,
                MaxDocuments = captureMaxDocs ?? 1,
                IdleTimeout = TimeSpan.FromSeconds(captureIdleSeconds ?? 120)
            }
        };

        return true;
    }

    private static bool TryGetOptionalInt(
        IReadOnlyDictionary<string, string> options,
        string key,
        out int? value,
        out string? errorMessage)
    {
        errorMessage = null;
        if (!options.TryGetValue(key, out var rawValue) || string.IsNullOrWhiteSpace(rawValue))
        {
            value = null;
            return true;
        }

        if (!int.TryParse(rawValue, out var parsed))
        {
            value = null;
            errorMessage = $"Invalid {key.Replace('-', ' ')} value: {rawValue}";
            return false;
        }

        value = parsed;
        return true;
    }

    private static bool TryGetOptionalDouble(
        IReadOnlyDictionary<string, string> options,
        string key,
        out double? value,
        out string? errorMessage)
    {
        errorMessage = null;
        if (!options.TryGetValue(key, out var rawValue) || string.IsNullOrWhiteSpace(rawValue))
        {
            value = null;
            return true;
        }

        if (!double.TryParse(rawValue, out var parsed))
        {
            value = null;
            errorMessage = $"Invalid {key.Replace('-', ' ')} value: {rawValue}";
            return false;
        }

        value = parsed;
        return true;
    }

    private static string? GetOptionalString(IReadOnlyDictionary<string, string> options, string key)
    {
        return options.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : null;
    }

    private int HandleRules(string[] args, IConsole console)
    {
        if (args.Length < 2)
        {
            console.WriteError("Missing rules subcommand (list or validate).");
            return 1;
        }

        var subcommand = args[1];
        var optionsResult = _parser.ParseOptions(args, 2);
        if (!optionsResult.IsSuccess)
        {
            console.WriteError(optionsResult.Error ?? "Invalid options.");
            return 1;
        }

        if (!optionsResult.Options.TryGetValue("rules", out var rulesRoot) || string.IsNullOrWhiteSpace(rulesRoot))
        {
            console.WriteError("Missing --rules for rules command.");
            return 1;
        }

        var loader = new RuleLoader();

        return subcommand switch
        {
            "list" => HandleRulesList(loader, rulesRoot, console),
            "validate" => HandleRulesValidate(loader, rulesRoot, console),
            _ => HandleUnknown($"rules {subcommand}", console)
        };
    }

    private int HandleRulesList(RuleLoader loader, string rulesRoot, IConsole console)
    {
        var teams = loader.LoadRules(rulesRoot);
        foreach (var team in teams)
        {
            console.WriteLine($"{team.TeamName}: {team.Rules.Count} rules");
        }

        return 0;
    }

    private int HandleRulesValidate(RuleLoader loader, string rulesRoot, IConsole console)
    {
        var result = loader.ValidateRules(rulesRoot);
        if (result.IsValid)
        {
            console.WriteLine("All rules are valid.");
            return 0;
        }

        foreach (var error in result.Errors)
        {
            console.WriteError($"{error.Team}/{error.RuleId}: {error.Message}");
        }

        return 1;
    }

    private int HandleReport(string[] args, IConsole console)
    {
        var optionsResult = _parser.ParseOptions(args, 1);
        if (!optionsResult.IsSuccess)
        {
            console.WriteError(optionsResult.Error ?? "Invalid options.");
            return 1;
        }

        if (!optionsResult.Options.TryGetValue("input", out var input) || string.IsNullOrWhiteSpace(input))
        {
            console.WriteError("Missing --input for report command.");
            return 1;
        }

        if (!optionsResult.Options.TryGetValue("out", out var output) || string.IsNullOrWhiteSpace(output))
        {
            console.WriteError("Missing --out for report command.");
            return 1;
        }

        var generator = new ReportGenerator();
        var scan = generator.LoadScanResult(input);
        var artifacts = generator.WriteReport(scan, output, "report");
        console.WriteLine($"Report written to {artifacts.JsonPath}, {artifacts.HtmlPath}, {artifacts.MarkdownPath}.");
        return 0;
    }

    private int HandleExport(string[] args, IConsole console)
    {
        if (args.Length < 2)
        {
            console.WriteError("Missing export subcommand (chromium-extension).");
            return 1;
        }

        var subcommand = args[1];
        var optionsResult = _parser.ParseOptions(args, 2);
        if (!optionsResult.IsSuccess)
        {
            console.WriteError(optionsResult.Error ?? "Invalid options.");
            return 1;
        }

        return subcommand switch
        {
            "chromium-extension" => HandleChromiumExtensionExport(optionsResult.Options, console),
            _ => HandleUnknown($"export {subcommand}", console)
        };
    }

    private int HandleChromiumExtensionExport(IReadOnlyDictionary<string, string> options, IConsole console)
    {
        if (!options.TryGetValue("out", out var outputDir) || string.IsNullOrWhiteSpace(outputDir))
        {
            console.WriteError("Missing --out for export command.");
            return 1;
        }

        if (!options.TryGetValue("capture-url", out var captureUrl) || string.IsNullOrWhiteSpace(captureUrl))
        {
            console.WriteError("Missing --capture-url for export command.");
            return 1;
        }

        if (!Uri.TryCreate(captureUrl, UriKind.Absolute, out _))
        {
            console.WriteError("Capture URL must be absolute.");
            return 1;
        }

        var token = options.TryGetValue("capture-token", out var captureToken) && !string.IsNullOrWhiteSpace(captureToken)
            ? captureToken
            : null;
        var extensionName = options.TryGetValue("name", out var nameValue) && !string.IsNullOrWhiteSpace(nameValue)
            ? nameValue
            : "ADA Scanner Capture";

        var exporter = new RuntimeCaptureExtensionExporter();
        exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
        {
            CaptureUrl = captureUrl,
            AccessToken = token,
            ExtensionName = extensionName
        }, outputDir);

        console.WriteLine($"Chromium extension written to {outputDir}.");
        return 0;
    }

    private int HandleUnknown(string command, IConsole console)
    {
        console.WriteError($"Unknown command: {command}.");
        return 1;
    }
}
