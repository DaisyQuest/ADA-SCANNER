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
}

public sealed class TestConsole : IConsole
{
    public List<string> Outputs { get; } = new();
    public List<string> Errors { get; } = new();

    public void WriteLine(string message) => Outputs.Add(message);
    public void WriteError(string message) => Errors.Add(message);
}
