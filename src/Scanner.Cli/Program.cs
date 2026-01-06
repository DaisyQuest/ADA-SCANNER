namespace Scanner.Cli;

public static class Program
{
    public static int Main(string[] args)
    {
        var dispatcher = new CommandDispatcher();
        return dispatcher.Dispatch(args, new SystemConsole());
    }
}
