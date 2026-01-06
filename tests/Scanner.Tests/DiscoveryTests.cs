using Scanner.Core.Discovery;
using Xunit;

namespace Scanner.Tests;

public sealed class DiscoveryTests
{
    [Fact]
    public void Discover_FromSolution_CollectsProjectFiles()
    {
        var root = TestUtilities.CreateTempDirectory();
        var projectPath = TestUtilities.WriteFile(root, "App/App.csproj", "<Project><ItemGroup><Page Include=\"Views/MainPage.xaml\" /></ItemGroup></Project>");
        TestUtilities.WriteFile(root, "App/Views/MainPage.xaml", "<Page></Page>");
        var solution = TestUtilities.WriteFile(root, "App.sln", $"Project(\"{{GUID}}\") = \"App\", \"App/App.csproj\", \"{{GUID}}\"\nEndProject");

        var discovery = new ProjectDiscovery();
        var result = discovery.Discover(solution);

        Assert.Single(result.Projects);
        Assert.Contains(projectPath, result.Projects);
        Assert.Single(result.Files);
        Assert.Equal("xaml", result.Files[0].Kind);
    }

    [Fact]
    public void Discover_FromDirectory_FallsBackToUiExtensions()
    {
        var root = TestUtilities.CreateTempDirectory();
        var html = TestUtilities.WriteFile(root, "Views/index.html", "<html></html>");

        var discovery = new ProjectDiscovery();
        var result = discovery.Discover(root);

        Assert.Empty(result.Projects);
        Assert.Single(result.Files);
        Assert.Equal(html, result.Files[0].Path);
    }

    [Fact]
    public void Discover_FromProject_HandlesMalformedXml()
    {
        var root = TestUtilities.CreateTempDirectory();
        var project = TestUtilities.WriteFile(root, "App/App.csproj", "<Project><ItemGroup>");
        var razor = TestUtilities.WriteFile(root, "App/Pages/Index.razor", "<div></div>");

        var discovery = new ProjectDiscovery();
        var result = discovery.Discover(project);

        Assert.Contains(result.Files, file => file.Path == razor);
    }

    [Fact]
    public void Discover_FromDirectory_IncludesCssFiles()
    {
        var root = TestUtilities.CreateTempDirectory();
        var css = TestUtilities.WriteFile(root, "wwwroot/site.css", ".card { color: #000; }");

        var discovery = new ProjectDiscovery();
        var result = discovery.Discover(root);

        Assert.Contains(result.Files, file => file.Path == css && file.Kind == "css");
    }
}
