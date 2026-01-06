namespace Scanner.Core.Checks;

public sealed class CheckRegistry
{
    private readonly IReadOnlyDictionary<string, ICheck> _checks;

    public CheckRegistry(IEnumerable<ICheck> checks)
    {
        _checks = checks.ToDictionary(check => check.Id, StringComparer.OrdinalIgnoreCase);
    }

    public ICheck? Find(string id)
    {
        _checks.TryGetValue(id, out var check);
        return check;
    }

    public static CheckRegistry Default() => new(new ICheck[]
    {
        new MissingLabelCheck(),
        new MissingAltTextCheck(),
        new InvalidAriaRoleCheck(),
        new HiddenNavigationCheck(),
        new InsufficientContrastCheck(),
        new XamlMissingNameCheck()
    });
}
