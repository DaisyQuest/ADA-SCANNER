using Scanner.Core;
using Scanner.Core.Reporting;
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
