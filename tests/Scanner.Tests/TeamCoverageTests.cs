using Scanner.Core.Rules;
using Xunit;

namespace Scanner.Tests;

public sealed class TeamCoverageTests
{
    private static readonly string[] Teams =
    [
        "contrast",
        "scanner-backend",
        "ui-frontend",
        "report-generation",
        "reflow",
        "aria-labels",
        "responsive-size",
        "hidden-navigation-elements",
        "error-message-at-top"
    ];

    [Fact]
    public void LoadRules_LoadsRulesForAllTeams()
    {
        var root = TestUtilities.CreateTempDirectory();
        var rulesRoot = Path.Combine(root, "rules");

        for (var index = 0; index < Teams.Length; index++)
        {
            var team = Teams[index];
            var extension = index % 2 == 0 ? "json" : "yaml";
            var content = extension == "json"
                ? "{\"id\":\"rule-" + team + "\",\"description\":\"desc\",\"severity\":\"low\",\"checkId\":\"missing-label\"}"
                : "id: rule-" + team + "\ndescription: desc\nseverity: low\ncheckId: missing-label";

            TestUtilities.WriteFile(root, $"rules/{team}/rule.{extension}", content);
        }

        var loader = new RuleLoader();
        var loadedTeams = loader.LoadRules(rulesRoot);

        Assert.Equal(Teams.Length, loadedTeams.Count);
        Assert.Equal(Teams.OrderBy(team => team), loadedTeams.Select(team => team.TeamName).OrderBy(team => team));
        Assert.All(loadedTeams, team => Assert.NotEmpty(team.Rules));
    }

    [Fact]
    public void ValidateRules_ReportsErrorsForEachTeam()
    {
        var root = TestUtilities.CreateTempDirectory();
        var rulesRoot = Path.Combine(root, "rules");

        foreach (var team in Teams)
        {
            var content = "{\"id\":\"\",\"description\":\"\",\"severity\":\"critical\",\"checkId\":\"unknown\"}";
            TestUtilities.WriteFile(root, $"rules/{team}/bad.json", content);
        }

        var loader = new RuleLoader();
        var result = loader.ValidateRules(rulesRoot);

        Assert.False(result.IsValid);
        Assert.All(Teams, team => Assert.Contains(result.Errors, error => error.Team == team));
    }
}
