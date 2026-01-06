namespace Scanner.Runner;

public static class Program
{
    public static int Main(string[] args)
    {
        var runner = new AdaScanRunner(Console.Out, Console.Error);
        return runner.Run(args);
    }
}
