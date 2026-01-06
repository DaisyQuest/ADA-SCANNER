namespace Scanner.Cli;

public interface IConsole
{
    void WriteLine(string message);
    void WriteError(string message);
}

public sealed class SystemConsole : IConsole
{
    public void WriteLine(string message) => Console.WriteLine(message);
    public void WriteError(string message) => Console.Error.WriteLine(message);
}
