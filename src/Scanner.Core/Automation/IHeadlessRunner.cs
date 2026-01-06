namespace Scanner.Core.Automation;

/// <summary>
/// Defines a headless execution hook for future automation integrations.
/// </summary>
public interface IHeadlessRunner
{
    /// <summary>
    /// Executes a headless run for the requested target path.
    /// </summary>
    /// <param name="request">The headless run request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The headless run result.</returns>
    Task<HeadlessRunResult> RunAsync(HeadlessRunRequest request, CancellationToken cancellationToken = default);
}

/// <summary>
/// Represents a request to run headless automation against a target.
/// </summary>
/// <param name="TargetPath">The target path to run against.</param>
/// <param name="OutputDirectory">The directory for output artifacts.</param>
public sealed record HeadlessRunRequest(string TargetPath, string OutputDirectory);

/// <summary>
/// Represents the outcome of a headless run.
/// </summary>
/// <param name="Success">Whether the run completed successfully.</param>
/// <param name="OutputPath">Optional path to output artifacts.</param>
/// <param name="ErrorMessage">Optional error message.</param>
public sealed record HeadlessRunResult(bool Success, string? OutputPath, string? ErrorMessage);
