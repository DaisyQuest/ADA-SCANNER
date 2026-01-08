using Scanner.Runner;
using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RunAdaScanTests
{
    [Fact]
    public void Run_UsesDefaultsAndWritesArtifacts()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error);

            var code = runner.Run(Array.Empty<string>());

            Assert.Equal(0, code);
            var reportDir = Path.Combine(root, "adareport");
            Assert.True(File.Exists(Path.Combine(reportDir, "scan.json")));
            Assert.True(File.Exists(Path.Combine(reportDir, "report.json")));
            Assert.True(File.Exists(Path.Combine(reportDir, "report.html")));
            Assert.True(File.Exists(Path.Combine(reportDir, "report.md")));
            Assert.Contains("Scan complete", output.ToString(), StringComparison.OrdinalIgnoreCase);
            Assert.Contains("Report written", output.ToString(), StringComparison.OrdinalIgnoreCase);
            Assert.Equal(string.Empty, error.ToString());
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_UsesProvidedOutputDirectory()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var outputDir = Path.Combine(root, "custom-output");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error);

            var code = runner.Run(new[] { root, outputDir });

            Assert.Equal(0, code);
            Assert.True(File.Exists(Path.Combine(outputDir, "scan.json")));
            Assert.True(File.Exists(Path.Combine(outputDir, "report.json")));
            Assert.Equal(string.Empty, error.ToString());
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_FailsWhenStartDirectoryMissing()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var missing = Path.Combine(root, "missing");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error);

            var code = runner.Run(new[] { missing });

            Assert.Equal(1, code);
            Assert.Contains("Start directory not found", error.ToString(), StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_FailsWhenRulesDirectoryMissing()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error);

            var code = runner.Run(new[] { root });

            Assert.Equal(1, code);
            Assert.Contains("Rules directory not found", error.ToString(), StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_FailsWhenRulesValidationFails()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"\",\"description\":\"\",\"severity\":\"bad\",\"checkId\":\"missing-alt-text\"}");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error);

            var code = runner.Run(new[] { root });

            Assert.Equal(1, code);
            Assert.Contains("Rule validation failed", error.ToString(), StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_FailsWithUsageWhenTooManyArguments()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[] { "one", "two", "three" });

        Assert.Equal(1, code);
        Assert.Contains("Usage", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_FailsWithUsageWhenRuntimeMaxDepthInvalid()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[]
        {
            "--runtime-url",
            "http://example.test",
            "--runtime-max-depth",
            "-1"
        });

        Assert.Equal(1, code);
        Assert.Contains("Invalid max depth value", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_FailsWithUsageWhenRuntimeStatusInvalid()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[]
        {
            "--runtime-url",
            "http://example.test",
            "--runtime-allowed-status",
            "999"
        });

        Assert.Equal(1, code);
        Assert.Contains("Invalid allowed status code", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_FailsWithUsageWhenRuntimeCapturePortInvalid()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[] { "--runtime-capture-port", "70000" });

        Assert.Equal(1, code);
        Assert.Contains("Invalid runtime capture port", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_FailsWhenRuntimeCaptureSettingsMissingPort()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[] { "--runtime-capture-max-docs", "2" });

        Assert.Equal(1, code);
        Assert.Contains("Runtime capture port is required", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_FailsWhenRuntimeCaptureCombinedWithRuntimeUrl()
    {
        var output = new StringWriter();
        var error = new StringWriter();
        var runner = new AdaScanRunner(output, error);

        var code = runner.Run(new[]
        {
            "--runtime-url",
            "http://example.test",
            "--runtime-capture-port",
            "45892"
        });

        Assert.Equal(1, code);
        Assert.Contains("Runtime capture cannot be combined", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Run_AllowsRuntimeOptionsAndWritesCombinedReport()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var outputDir = Path.Combine(root, "custom-output");

        var runtimeSource = new StubRuntimeSource(new[]
        {
            new RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<img src=\"hero.png\">", DateTimeOffset.UtcNow)
        });

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error, runtimeSource);

            var code = runner.Run(new[]
            {
                root,
                outputDir,
                "--runtime-url",
                "http://example.test/page",
                "--auth-header",
                "Authorization: Bearer token"
            });

            Assert.Equal(0, code);
            var reportJson = File.ReadAllText(Path.Combine(outputDir, "report.json"));
            Assert.Contains("runtimeScan", reportJson, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_AllowsRuntimeCaptureOptionsWithoutUrls()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var outputDir = Path.Combine(root, "custom-output");

        var runtimeSource = new StubRuntimeSource(Array.Empty<RuntimeHtmlDocument>());

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error, runtimeSource);

            var code = runner.Run(new[]
            {
                root,
                outputDir,
                "--runtime-capture-port",
                "45892"
            });

            Assert.Equal(0, code);
            var reportJson = File.ReadAllText(Path.Combine(outputDir, "report.json"));
            Assert.Contains("runtimeScan", reportJson, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_RuntimeFailuresDoNotFailStaticScan()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error, new FailingRuntimeSource());

            var code = runner.Run(new[] { root, "--runtime-url", "http://example.test/page" });

            Assert.Equal(0, code);
            Assert.Contains("Runtime scan failed", error.ToString(), StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    [Fact]
    public void Run_WritesFormConfigAndEditor()
    {
        var root = TestUtilities.CreateTempDirectory();
        TestUtilities.WriteFile(root, "index.html", "<img src=\"hero.png\">");
        TestUtilities.WriteFile(root, "rules/team/rule.json", "{\"id\":\"alt-1\",\"description\":\"Missing alt\",\"severity\":\"low\",\"checkId\":\"missing-alt-text\"}");
        var outputDir = Path.Combine(root, "out");
        var configPath = Path.Combine(root, "runtime-forms.json");

        var runtimeSource = new StubRuntimeSource(new[]
        {
            new RuntimeHtmlDocument("http://example.test/page", 200, "text/html", "<form action=\"/login\"><input name=\"user\"></form>", DateTimeOffset.UtcNow)
        });

        var original = Directory.GetCurrentDirectory();
        Directory.SetCurrentDirectory(root);
        try
        {
            var output = new StringWriter();
            var error = new StringWriter();
            var runner = new AdaScanRunner(output, error, runtimeSource);

            var code = runner.Run(new[]
            {
                root,
                outputDir,
                "--runtime-url",
                "http://example.test/page",
                "--runtime-form-config",
                configPath
            });

            Assert.Equal(0, code);
            Assert.True(File.Exists(configPath));
            Assert.True(File.Exists(Path.Combine(outputDir, "form-config-editor.html")));
        }
        finally
        {
            Directory.SetCurrentDirectory(original);
        }
    }

    private sealed class StubRuntimeSource : IRuntimeDocumentSource
    {
        private readonly IReadOnlyList<RuntimeHtmlDocument> _documents;

        public StubRuntimeSource(IReadOnlyList<RuntimeHtmlDocument> documents)
        {
            _documents = documents;
        }

        public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
            RuntimeScanOptions options,
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

    private sealed class FailingRuntimeSource : IRuntimeDocumentSource
    {
        public async IAsyncEnumerable<RuntimeHtmlDocument> GetDocumentsAsync(
            RuntimeScanOptions options,
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            await Task.Yield();
            throw new InvalidOperationException("Boom");
        }
    }
}
