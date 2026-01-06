using System.Text.Json;
using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Reporting;
using Scanner.Core.Rules;

namespace Scanner.Cli;

public sealed class CommandDispatcher
{
    private readonly CommandLineParser _parser = new();

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

        var engine = new ScanEngine(new ProjectDiscovery(), new RuleLoader(), CheckRegistry.Default());
        var result = engine.Scan(new ScanOptions { Path = path, RulesRoot = rulesRoot });

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
            var reportArtifacts = generator.WriteReport(result, reportOutDir!, reportBaseName ?? "report");
            console.WriteLine($"Report written to {reportArtifacts.JsonPath}, {reportArtifacts.HtmlPath}, {reportArtifacts.MarkdownPath}.");
        }

        return 0;
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

    private int HandleUnknown(string command, IConsole console)
    {
        console.WriteError($"Unknown command: {command}.");
        return 1;
    }
}
