namespace Scanner.Cli;

public sealed class CommandLineParser
{
    public ParseResult Parse(string[] args)
    {
        if (args.Length == 0)
        {
            return ParseResult.Failure("No command provided.");
        }

        var command = args[0];
        var optionsResult = ParseOptions(args, 1);
        return optionsResult.IsSuccess
            ? ParseResult.Success(command, optionsResult.Options)
            : ParseResult.Failure(optionsResult.Error ?? "Invalid options.");
    }

    public ParseOptionsResult ParseOptions(string[] args, int startIndex)
    {
        var options = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        for (var i = startIndex; i < args.Length; i++)
        {
            var token = args[i];
            if (!token.StartsWith("--", StringComparison.Ordinal))
            {
                continue;
            }

            var key = token[2..];
            if (i + 1 >= args.Length || args[i + 1].StartsWith("--", StringComparison.Ordinal))
            {
                return ParseOptionsResult.Failure($"Missing value for option '{key}'.");
            }

            options[key] = args[i + 1];
            i++;
        }

        return ParseOptionsResult.Success(options);
    }
}

public sealed record ParseResult(bool IsSuccess, string? Command, IReadOnlyDictionary<string, string> Options, string? Error)
{
    public static ParseResult Success(string command, IReadOnlyDictionary<string, string> options)
        => new(true, command, options, null);

    public static ParseResult Failure(string error)
        => new(false, null, new Dictionary<string, string>(), error);
}

public sealed record ParseOptionsResult(bool IsSuccess, IReadOnlyDictionary<string, string> Options, string? Error)
{
    public static ParseOptionsResult Success(IReadOnlyDictionary<string, string> options)
        => new(true, options, null);

    public static ParseOptionsResult Failure(string error)
        => new(false, new Dictionary<string, string>(), error);
}
