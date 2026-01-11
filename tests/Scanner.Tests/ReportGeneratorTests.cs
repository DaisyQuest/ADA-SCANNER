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
    public void ReportGenerator_ReportsEmptyRuntimeIssues()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = new[] { new Issue("rule", "check", "file", 1, "message", null) }
        };
        var runtime = new RuntimeScanResult
        {
            SeedUrls = new[] { "http://example.test" },
            Documents = Array.Empty<RuntimeHtmlDocument>(),
            Issues = Array.Empty<Issue>(),
            Forms = Array.Empty<RuntimeFormConfiguration>()
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report", runtime);

        var html = File.ReadAllText(artifacts.HtmlPath);
        Assert.Contains("Runtime Scan", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("No issues found", html, StringComparison.OrdinalIgnoreCase);

        var markdown = File.ReadAllText(artifacts.MarkdownPath);
        Assert.Contains("Runtime Issues by Rule", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("| _None_ | 0 |", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Discovered Forms", markdown, StringComparison.OrdinalIgnoreCase);
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

    [Fact]
    public void ReportGenerator_ReportsNoIssuesWhenEmpty()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = Array.Empty<Issue>()
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report");

        var html = File.ReadAllText(artifacts.HtmlPath);
        Assert.Contains("No issues found", html, StringComparison.OrdinalIgnoreCase);

        var markdown = File.ReadAllText(artifacts.MarkdownPath);
        Assert.Contains("No issues found", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("_None_", markdown, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ReportGenerator_IncludesRuleFilters()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = new[]
            {
                new Issue("rule-a", "check-a", "file-a", 1, "message-a", null),
                new Issue("rule-b", "check-b", "file-b", 2, "message-b", null)
            }
        };
        var runtime = new RuntimeScanResult
        {
            SeedUrls = new[] { "http://example.test" },
            Documents = Array.Empty<RuntimeHtmlDocument>(),
            Issues = new[] { new Issue("rule-b", "check-b", "http://example.test", 1, "message", null) },
            Forms = Array.Empty<RuntimeFormConfiguration>()
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report", runtime);

        var html = File.ReadAllText(artifacts.HtmlPath);
        Assert.Contains("Rule Filters", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("rule-filter-item", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("id=\"rule-filter-all\" checked", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("value=\"rule-a\" checked", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("value=\"rule-b\" checked", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("data-rule=\"rule-a\"", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("data-rule=\"rule-b\"", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ReportGenerator_SanitizesInvalidBaseName()
    {
        var root = TestUtilities.CreateTempDirectory();
        var invalidChar = Path.GetInvalidFileNameChars()[0];
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = new[] { new Issue("rule", "check", "file", 1, "message", null) }
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, $"report{invalidChar}name");

        Assert.DoesNotContain(invalidChar, Path.GetFileName(artifacts.JsonPath));
        Assert.True(File.Exists(artifacts.JsonPath));
    }

    [Fact]
    public void ReportGenerator_EscapesOutputFields()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = Array.Empty<DiscoveredFile>(),
            Issues = new[] { new Issue("rule", "check", "file|path", 1, "<script>alert(1)</script>", null) }
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report");

        var html = File.ReadAllText(artifacts.HtmlPath);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script>", html, StringComparison.OrdinalIgnoreCase);

        var markdown = File.ReadAllText(artifacts.MarkdownPath);
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("file\\|path", markdown, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ReportGenerator_ThrowsOnInvalidInputs()
    {
        var generator = new ReportGenerator();
        Assert.Throws<ArgumentException>(() => generator.LoadScanResult(" "));
        Assert.Throws<ArgumentException>(() => generator.WriteReport(new ScanResult(), " ", "report"));
        Assert.Throws<ArgumentException>(() => generator.WriteReport(new ScanResult(), "output", " "));
    }

    [Fact]
    public void ReportGenerator_ThrowsOnInvalidScanJson()
    {
        var root = TestUtilities.CreateTempDirectory();
        var path = Path.Combine(root, "scan.json");
        File.WriteAllText(path, "not-json");

        var generator = new ReportGenerator();

        Assert.Throws<InvalidDataException>(() => generator.LoadScanResult(path));
    }

    [Fact]
    public void ReportGenerator_HandlesNullCollections()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scan = new ScanResult
        {
            ScannedPath = root,
            Files = null!,
            Issues = null!
        };

        var generator = new ReportGenerator();
        var artifacts = generator.WriteReport(scan, root, "report");

        var markdown = File.ReadAllText(artifacts.MarkdownPath);
        Assert.Contains("No issues found", markdown, StringComparison.OrdinalIgnoreCase);
    }
}
