using System.Xml.Linq;

namespace Scanner.Core.Discovery;

public sealed class ProjectDiscovery
{
    private static readonly string[] UiExtensions =
    {
        ".xaml",
        ".cshtml",
        ".razor",
        ".html",
        ".htm"
    };

    public DiscoveryResult Discover(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new ArgumentException("Path is required.", nameof(path));
        }

        var fullPath = Path.GetFullPath(path);
        if (File.Exists(fullPath) && fullPath.EndsWith(".sln", StringComparison.OrdinalIgnoreCase))
        {
            return DiscoverFromSolution(fullPath);
        }

        if (File.Exists(fullPath) && fullPath.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
        {
            return DiscoverFromProjects(new[] { fullPath }, Path.GetDirectoryName(fullPath)!);
        }

        if (Directory.Exists(fullPath))
        {
            return DiscoverFromDirectory(fullPath);
        }

        throw new FileNotFoundException($"Path not found: {fullPath}");
    }

    private DiscoveryResult DiscoverFromDirectory(string directory)
    {
        var solutionFiles = Directory.EnumerateFiles(directory, "*.sln", SearchOption.AllDirectories).ToList();
        if (solutionFiles.Count > 0)
        {
            var combined = new List<DiscoveredFile>();
            var projects = new List<string>();
            foreach (var solution in solutionFiles)
            {
                var result = DiscoverFromSolution(solution);
                combined.AddRange(result.Files);
                projects.AddRange(result.Projects);
            }

            return new DiscoveryResult(directory, combined, projects.Distinct(StringComparer.OrdinalIgnoreCase).ToList());
        }

        var projectFiles = Directory.EnumerateFiles(directory, "*.csproj", SearchOption.AllDirectories).ToList();
        if (projectFiles.Count > 0)
        {
            return DiscoverFromProjects(projectFiles, directory);
        }

        var files = DiscoverUiFiles(directory);
        return new DiscoveryResult(directory, files, Array.Empty<string>());
    }

    private DiscoveryResult DiscoverFromSolution(string solutionPath)
    {
        var solutionDirectory = Path.GetDirectoryName(solutionPath)!;
        var projectPaths = new List<string>();
        foreach (var line in File.ReadLines(solutionPath))
        {
            if (!line.StartsWith("Project(", StringComparison.Ordinal))
            {
                continue;
            }

            var parts = line.Split(',');
            if (parts.Length < 2)
            {
                continue;
            }

            var relative = parts[1].Trim().Trim('"');
            if (!relative.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var projectPath = Path.GetFullPath(Path.Combine(solutionDirectory, relative));
            if (File.Exists(projectPath))
            {
                projectPaths.Add(projectPath);
            }
        }

        return DiscoverFromProjects(projectPaths, solutionDirectory);
    }

    private DiscoveryResult DiscoverFromProjects(IEnumerable<string> projectPaths, string root)
    {
        var files = new List<DiscoveredFile>();
        var projects = new List<string>();
        foreach (var projectPath in projectPaths)
        {
            if (!File.Exists(projectPath))
            {
                continue;
            }

            projects.Add(projectPath);
            files.AddRange(DiscoverFromProject(projectPath));
        }

        return new DiscoveryResult(root, files, projects);
    }

    private IEnumerable<DiscoveredFile> DiscoverFromProject(string projectPath)
    {
        var projectDirectory = Path.GetDirectoryName(projectPath)!;
        var files = new List<DiscoveredFile>();
        XDocument? doc = null;
        try
        {
            doc = XDocument.Load(projectPath);
        }
        catch
        {
            // Ignore malformed project files; fallback to directory scan.
        }

        if (doc != null)
        {
            foreach (var element in doc.Descendants())
            {
                var include = element.Attribute("Include")?.Value;
                if (string.IsNullOrWhiteSpace(include))
                {
                    continue;
                }

                var extension = Path.GetExtension(include);
                if (!UiExtensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
                {
                    continue;
                }

                var filePath = Path.GetFullPath(Path.Combine(projectDirectory, include));
                if (File.Exists(filePath))
                {
                    files.Add(new DiscoveredFile(filePath, extension.TrimStart('.').ToLowerInvariant()));
                }
            }
        }

        if (files.Count == 0)
        {
            files.AddRange(DiscoverUiFiles(projectDirectory));
        }

        return files;
    }

    private static List<DiscoveredFile> DiscoverUiFiles(string directory)
    {
        var files = new List<DiscoveredFile>();
        foreach (var extension in UiExtensions)
        {
            foreach (var file in Directory.EnumerateFiles(directory, $"*{extension}", SearchOption.AllDirectories))
            {
                files.Add(new DiscoveredFile(Path.GetFullPath(file), extension.TrimStart('.')));
            }
        }

        return files;
    }
}

public sealed record DiscoveryResult(string Root, IReadOnlyList<DiscoveredFile> Files, IReadOnlyList<string> Projects);
