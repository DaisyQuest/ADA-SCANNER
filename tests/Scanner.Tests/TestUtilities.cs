namespace Scanner.Tests;

public static class TestUtilities
{
    public static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), "ada-scanner", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

    public static string WriteFile(string root, string relativePath, string content)
    {
        var path = Path.Combine(root, relativePath);
        var directory = Path.GetDirectoryName(path)!;
        Directory.CreateDirectory(directory);
        File.WriteAllText(path, content);
        return path;
    }

    public static string FindRepositoryRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null && !File.Exists(Path.Combine(current.FullName, "PROJECT_SPEC.md")))
        {
            current = current.Parent;
        }

        if (current == null)
        {
            throw new DirectoryNotFoundException("Repository root could not be located.");
        }

        return current.FullName;
    }

    public static string GetLayoutFixturePath(string fileName)
    {
        var baseDir = AppContext.BaseDirectory;
        return Path.Combine(baseDir, "Resources", "Layouts", fileName);
    }
}
