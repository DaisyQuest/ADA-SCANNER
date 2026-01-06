using Scanner.Runner;
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
}
