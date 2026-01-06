using System.Text.Json;
using Scanner.Core;
using Scanner.Core.Checks;
using Scanner.Core.Discovery;
using Scanner.Core.Reporting;
using Scanner.Core.Rules;

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

    public AdaScanRunner(TextWriter output, TextWriter error)
    {
        _output = output;
        _error = error;
    }

    public int Run(string[] args)
    {
        if (args.Length > 2)
        {
            _error.WriteLine("Usage: run-ada-scan.exe [startDir] [outputDir]");
            return 1;
        }

        var current = Directory.GetCurrentDirectory();
        var startDir = args.Length > 0 && !string.IsNullOrWhiteSpace(args[0])
            ? args[0]
            : current;
        var outputDir = args.Length > 1 && !string.IsNullOrWhiteSpace(args[1])
            ? args[1]
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

            Directory.CreateDirectory(outputDir);
            var scanPath = Path.Combine(outputDir, "scan.json");
            File.WriteAllText(scanPath, JsonSerializer.Serialize(scan, SerializerOptions));

            var generator = new ReportGenerator();
            var artifacts = generator.WriteReport(scan, outputDir, "report");

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
}
