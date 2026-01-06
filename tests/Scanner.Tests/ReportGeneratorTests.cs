using Scanner.Core;
using Scanner.Core.Reporting;
using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class ReportGeneratorTests
{
    [Fact]
    public void ReportGenerator_WritesArtifacts()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = new[] { new Issue("rule", "check", "file", 1, "message", null) }
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report");

        Assert.True(File.Exists(artifacts.JsonPath));
        Assert.True(File.Exists(artifacts.HtmlPath));
        Assert.True(File.Exists(artifacts.MarkdownPath));
    }

    [Fact]
    public void ReportGenerator_IncludesRuntimeScan()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = Array.Empty<Issue>()
        };
        var runtime = new RuntimeScanResult
        {
            SeedUrls = new[] { "http://example.test" },
            Documents = Array.Empty<RuntimeHtmlDocument>(),
            Issues = new[] { new Issue("rule", "check", "http://example.test", 1, "message", null) },
            FormConfigurationPath = Path.Combine(root, "runtime-forms.json"),
            Forms = new[]
            {
                new RuntimeFormConfiguration
                {
                    Action = "http://example.test/login",
                    Method = "POST",
                    Inputs = new[]
                    {
                        new RuntimeFormInputConfiguration { Name = "user", Type = "text" }
                    }
                }
            }
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report", runtime);

        var json = File.ReadAllText(artifacts.JsonPath);
        Assert.Contains("\"runtimeScan\"", json, StringComparison.OrdinalIgnoreCase);

        var markdown = File.ReadAllText(artifacts.MarkdownPath);
        Assert.Contains("Runtime Scan", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Form config", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Discovered Forms", markdown, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ReportGenerator_LoadsScanResult()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = Path.Combine(root, "scan.json");
        File.WriteAllText(path, "{\"scannedPath\":\"" + root.Replace("\\", "\\\\") + "\",\"files\":[],\"issues\":[]}");

        var generator = new ReportGenerator();
        var loaded = generator.LoadScanResult(path);

        Assert.Equal(root, loaded.ScannedPath);
    }
}
