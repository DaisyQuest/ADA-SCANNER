using System.Text.RegularExpressions;
using Scanner.Core.Rules;

namespace Scanner.Core.Checks;

/// <summary>
/// Checks XAML controls for missing automation names.
/// </summary>
public sealed class XamlMissingNameCheck : ICheck
{
    private static readonly Regex ControlRegex = new("<(Image|Button|TextBox)(?<attrs>[^>]*)>", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <inheritdoc />
    public string Id => "xaml-missing-name";

    /// <inheritdoc />
    public IReadOnlyCollection<string> ApplicableKinds { get; } = new[] { "xaml" };

    /// <inheritdoc />
    public IEnumerable<Issue> Run(CheckContext context, RuleDefinition rule)
    {
        foreach (Match match in ControlRegex.Matches(context.Content))
        {
            var attrs = match.Groups["attrs"].Value;
            if (TextUtilities.ContainsAttribute(attrs, "AutomationProperties.Name")
                || TextUtilities.ContainsAttribute(attrs, "AutomationProperties.HelpText"))
            {
                continue;
            }

            var line = TextUtilities.GetLineNumber(context.Content, match.Index);
            yield return new Issue(rule.Id, Id, context.FilePath, line, "XAML control missing AutomationProperties.Name.", match.Value);
        }
    }
}
