namespace Scanner.Core.Automation;

public interface IHeadlessRunner
{
    Task<HeadlessRunResult> RunAsync(HeadlessRunRequest request, CancellationToken cancellationToken = default);
}

public sealed record HeadlessRunRequest(string TargetPath, string OutputDirectory);

public sealed record HeadlessRunResult(bool Success, string? OutputPath, string? ErrorMessage);
