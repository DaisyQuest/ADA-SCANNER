using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Provides context for running a check against a single file.
/// </summary>
/// <param name="FilePath">The path of the file being checked.</param>
/// <param name="Content">The file content.</param>
/// <param name="Kind">The detected UI file kind.</param>
public sealed record CheckContext(string FilePath, string Content, string Kind);

/// <summary>
/// Defines a check that can be executed for a specific rule.
/// </summary>
public interface ICheck
{
    /// <summary>
    /// Gets the unique identifier for the check.
    /// </summary>
    string Id { get; }

    /// <summary>
    /// Gets the supported UI kinds for the check.
    /// </summary>
    IReadOnlyCollection<string> ApplicableKinds { get; }

    /// <summary>
    /// Executes the check against the provided context.
    /// </summary>
    /// <param name="context">The file context for the check.</param>
    /// <param name="rule">The rule definition that configured the check.</param>
    /// <returns>Any issues discovered by the check.</returns>
    IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule);
}
