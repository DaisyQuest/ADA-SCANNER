using Scanner.Cli;
using Xunit;

namespace Scanner.Tests;

public sealed class CliTests
{
    [Fact]
    public void CommandLineParser_FailsOnMissingOptionValue()
    {
        var parser = new CommandLineParser();
        var result = parser.Parse(new[] { "scan", "--path" });

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public void CommandDispatcher_UnknownCommand_ReturnsNonZero()
    {
        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[] { "unknown" }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("Unknown command", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_RulesList_PrintsTeamCounts()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[] { "rules", "list", "--rules", Path.Combine(root, "rules") }, console);

        Assert.Equal(0, code);
        Assert.Contains("team: 1 rules", console.Outputs);
    }

    [Fact]
    public void CommandDispatcher_RulesValidate_ReturnsFailureOnErrors()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"\",\"description\":\"\",\"severity\":\"bad\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[] { "rules", "validate", "--rules", Path.Combine(root, "rules") }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("Rule severity", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_RulesList_WorksOfflineHeadless()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[] { "rules", "list", "--rules", Path.Combine(root, "rules") }, console);

        Assert.Equal(0, code);
        Assert.Single(console.Outputs);
        Assert.Empty(console.Errors);
    }

    [Fact]
    public void CommandDispatcher_RulesValidate_WorksOfflineHeadless()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[] { "rules", "validate", "--rules", Path.Combine(root, "rules") }, console);

        Assert.Equal(0, code);
        Assert.Contains("All rules are valid.", console.Outputs);
        Assert.Empty(console.Errors);
    }

    [Fact]
    public void CommandDispatcher_Report_WritesArtifacts()
    {
        var root = TestUtilities.CreateTempDirectory();
        var scanPath = TestUtilities.WriteFile(root, "scan.json", "{\"scannedPath\":\"" + root.Replace("\\", "\\\\") + "\",\"files\":[],\"issues\":[]}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var output = Path.Combine(root, "reports");
        var code = dispatcher.Dispatch(new[] { "report", "--input", scanPath, "--out", output }, console);

        Assert.Equal(0, code);
        Assert.True(File.Exists(Path.Combine(output, "report.json")));
        Assert.Contains(console.Outputs, message => message.Contains("Report written", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_WritesScanJson()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">" );
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var output = Path.Combine(root, "artifacts");
        var code = dispatcher.Dispatch(new[] { "scan", "--path", root, "--rules", Path.Combine(root, "rules"), "--out", output }, console);

        Assert.Equal(0, code);
        Assert.True(File.Exists(Path.Combine(output, "scan.json")));
        Assert.Contains(console.Outputs, message => message.Contains("Scan complete", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_WithReportOut_WritesReportArtifacts()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">" );
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var output = Path.Combine(root, "artifacts");
        var reportOutput = Path.Combine(root, "report");
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--out",
            output,
            "--report-out",
            reportOutput
        }, console);

        Assert.Equal(0, code);
        Assert.True(File.Exists(Path.Combine(output, "scan.json")));
        Assert.True(File.Exists(Path.Combine(reportOutput, "report.json")));
        Assert.True(File.Exists(Path.Combine(reportOutput, "report.html")));
        Assert.True(File.Exists(Path.Combine(reportOutput, "report.md")));
        Assert.Contains(console.Outputs, message => message.Contains("Report written", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_ReportBaseWithoutReportOut_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--report-base",
            "custom"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("report-base", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_ReportOutWhitespace_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--report-out",
            "   "
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("--report-out", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_ReportBaseWhitespace_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--report-out",
            Path.Combine(root, "report"),
            "--report-base",
            "   "
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("--report-base", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_ExportChromiumExtension_WritesBundle()
    {
        var root = TestUtilities.CreateTempDirectory();

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var output = Path.Combine(root, "extension");
        var code = dispatcher.Dispatch(new[]
        {
            "export",
            "chromium-extension",
            "--out",
            output,
            "--capture-url",
            "http://127.0.0.1:45892/capture"
        }, console);

        Assert.Equal(0, code);
        Assert.True(File.Exists(Path.Combine(output, "manifest.json")));
        Assert.True(File.Exists(Path.Combine(output, "background.js")));
        Assert.Contains(console.Outputs, message => message.Contains("Chromium extension written", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_ExportChromiumExtension_MissingOutput_ReturnsError()
    {
        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "export",
            "chromium-extension",
            "--capture-url",
            "http://127.0.0.1:45892/capture"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("--out", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_ExportChromiumExtension_MissingCaptureUrl_ReturnsError()
    {
        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "export",
            "chromium-extension",
            "--out",
            "extension"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("--capture-url", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_ExportChromiumExtension_InvalidCaptureUrl_ReturnsError()
    {
        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "export",
            "chromium-extension",
            "--out",
            "extension",
            "--capture-url",
            "not-a-url"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("Capture URL must be absolute", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_WithRuntimeCapture_WritesRuntimeReport()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var reportOut = Path.Combine(root, "report");
        var output = Path.Combine(root, "out");

        var runtimeSource = new StubRuntimeSource(new[]
        {
            new Scanner.Core.Runtime.RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<img src=\"hero.png\">", DateTimeOffset.UtcNow)
        });

        var dispatcher = new CommandDispatcher(runtimeSource);
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--out",
            output,
            "--report-out",
            reportOut,
            "--runtime-capture-port",
            "45892"
        }, console);

        Assert.Equal(0, code);
        var reportJson = File.ReadAllText(Path.Combine(reportOut, "report.json"));
        Assert.Contains("runtimeScan", reportJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureMissingPort_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--runtime-capture-max-docs",
            "2"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("Runtime capture port is required", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureInvalidPort_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--runtime-capture-port",
            "70000"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("Invalid runtime capture port", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureInvalidSampleRate_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--runtime-capture-port",
            "45892",
            "--runtime-sample-rate",
            "2"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("runtime sample rate", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureFailure_DoesNotFailScan()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var output = Path.Combine(root, "out");

        var dispatcher = new CommandDispatcher(new FailingRuntimeSource());
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--out",
            output,
            "--runtime-capture-port",
            "45892"
        }, console);

        Assert.Equal(0, code);
        Assert.Contains(console.Errors, message => message.Contains("Runtime scan failed", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureWithoutReportOut_RunsListener()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var output = Path.Combine(root, "out");

        var runtimeSource = new TrackingRuntimeSource();
        var dispatcher = new CommandDispatcher(runtimeSource);
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--out",
            output,
            "--runtime-capture-port",
            "45892"
        }, console);

        Assert.Equal(0, code);
        Assert.True(runtimeSource.WasCalled);
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureInvalidIdleSeconds_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--runtime-capture-port",
            "45892",
            "--runtime-capture-idle-seconds",
            "nope"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("runtime capture idle seconds", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void CommandDispatcher_Scan_RuntimeCaptureInvalidMaxBodyBytes_ReturnsError()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var dispatcher = new CommandDispatcher();
        var console = new TestConsole();
        var code = dispatcher.Dispatch(new[]
        {
            "scan",
            "--path",
            root,
            "--rules",
            Path.Combine(root, "rules"),
            "--runtime-capture-port",
            "45892",
            "--runtime-max-body-bytes",
            "nope"
        }, console);

        Assert.Equal(1, code);
        Assert.Contains(console.Errors, message => message.Contains("runtime max body bytes", StringComparison.OrdinalIgnoreCase));
    }
}

public sealed class TestConsole : IConsole
{
    public List<string> Outputs { get; } = new();
    public List<string> Errors { get; } = new();

    public void WriteLine(string message) => Outputs.Add(message);
    public void WriteError(string message) => Errors.Add(message);
}

public sealed class StubRuntimeSource : Scanner.Core.Runtime.IRuntimeDocumentSource
{
    private readonly IReadOnlyList<Scanner.Core.Runtime.RuntimeHtmlDocument> _documents;

    public StubRuntimeSource(IReadOnlyList<Scanner.Core.Runtime.RuntimeHtmlDocument> documents)
    {
        _documents = documents;
    }

    public async IAsyncEnumerable<Scanner.Core.Runtime.RuntimeHtmlDocument> GetDocumentsAsync(
        Scanner.Core.Runtime.RuntimeScanOptions options,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        foreach (var document in _documents)
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return document;
            await Task.Yield();
        }
    }
}

public sealed class FailingRuntimeSource : Scanner.Core.Runtime.IRuntimeDocumentSource
{
    public async IAsyncEnumerable<Scanner.Core.Runtime.RuntimeHtmlDocument> GetDocumentsAsync(
        Scanner.Core.Runtime.RuntimeScanOptions options,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        await Task.Yield();
        throw new InvalidOperationException("Boom");
    }
}

public sealed class TrackingRuntimeSource : Scanner.Core.Runtime.IRuntimeDocumentSource
{
    public bool WasCalled { get; private set; }

    public async IAsyncEnumerable<Scanner.Core.Runtime.RuntimeHtmlDocument> GetDocumentsAsync(
        Scanner.Core.Runtime.RuntimeScanOptions options,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        WasCalled = true;
        await Task.Yield();
    }
}
