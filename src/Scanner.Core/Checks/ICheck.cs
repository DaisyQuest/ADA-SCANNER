using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

public sealed record CheckContext(string FilePath, string Content, string Kind);

public interface ICheck
{
    string Id { get; }
    IReadOnlyCollection<string> ApplicableKinds { get; }
    IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule);
}
