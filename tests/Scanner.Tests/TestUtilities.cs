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
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AdaScanner.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Repository root not found starting from test directory.");
    }
}
