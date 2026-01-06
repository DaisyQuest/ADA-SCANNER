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
}
