namespace Scanner.Core.Checks;

/// <summary>
/// Provides lookup access to registered checks by identifier.
/// </summary>
public sealed class CheckRegistry
{
    private readonly IReadOnlyDictionary<string, ICheck> _checks;

    /// <summary>
    /// Initializes a new instance of the <see cref="CheckRegistry"/> class.
    /// </summary>
    /// <param name="checks">The collection of checks to register.</param>
    public CheckRegistry(IEnumerable<ICheck> checks)
    {
        _checks = checks.ToDictionary(check => check.Id, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Finds a check by identifier.
    /// </summary>
    /// <param name="id">The check identifier.</param>
    /// <returns>The matching check, or null if not found.</returns>
    public ICheck? Find(string id)
    {
        _checks.TryGetValue(id, out var check);
        return check;
    }

    /// <summary>
    /// Creates a registry with all built-in checks.
    /// </summary>
    /// <returns>A registry containing the default checks.</returns>
    public static CheckRegistry Default() => new(new ICheck[]
    {
        new MissingLabelCheck(),
        new UnlabeledButtonCheck(),
        new MissingTableHeaderCheck(),
        new MissingAltTextCheck(),
        new InvalidAriaRoleCheck(),
        new HiddenNavigationCheck(),
        new InsufficientContrastCheck(),
        new XamlMissingNameCheck()
    });
}
