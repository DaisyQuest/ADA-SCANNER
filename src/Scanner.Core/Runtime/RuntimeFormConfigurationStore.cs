using System.Text.Json;

namespace Scanner.Core.Runtime;

/// <summary>
/// Manages loading, merging, and saving runtime form configuration files.
/// </summary>
public sealed class RuntimeFormConfigurationStore
{
    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly Dictionary<string, RuntimeFormConfiguration> _forms = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Gets a value indicating whether new forms have been discovered.
    /// </summary>
    public bool IsDirty { get; private set; }

    /// <summary>
    /// Gets the configured forms.
    /// </summary>
    public IReadOnlyList<RuntimeFormConfiguration> Forms => _forms.Values.OrderBy(form => form.Key, StringComparer.OrdinalIgnoreCase).ToList();

    /// <summary>
    /// Loads a configuration store from a JSON file path.
    /// </summary>
    /// <param name="path">Path to the JSON file.</param>
    /// <returns>The loaded configuration store.</returns>
    public static RuntimeFormConfigurationStore Load(string path)
    {
        var store = new RuntimeFormConfigurationStore();
        if (!File.Exists(path))
        {
            return store;
        }

        var json = File.ReadAllText(path);
        var set = JsonSerializer.Deserialize<RuntimeFormConfigurationSet>(json, SerializerOptions);
        if (set?.Forms == null)
        {
            return store;
        }

        foreach (var form in set.Forms)
        {
            if (string.IsNullOrWhiteSpace(form.Key))
            {
                continue;
            }

            store._forms[form.Key] = form;
        }

        return store;
    }

    /// <summary>
    /// Saves the current form configuration to a JSON file.
    /// </summary>
    /// <param name="path">Path to write the JSON file.</param>
    public void Save(string path)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var payload = new RuntimeFormConfigurationSet { Forms = Forms };
        File.WriteAllText(path, JsonSerializer.Serialize(payload, SerializerOptions));
        IsDirty = false;
    }

    /// <summary>
    /// Registers discovered forms, merging them with existing configuration.
    /// </summary>
    /// <param name="forms">Forms extracted from runtime HTML.</param>
    public void RegisterDiscoveredForms(IEnumerable<RuntimeFormDefinition> forms)
    {
        foreach (var form in forms)
        {
            if (_forms.TryGetValue(form.Key, out var existing))
            {
                var merged = Merge(existing, form);
                if (!ConfigurationsEqual(existing, merged))
                {
                    _forms[form.Key] = merged;
                    IsDirty = true;
                }

                continue;
            }

            _forms[form.Key] = BuildConfiguration(form);
            IsDirty = true;
        }
    }

    /// <summary>
    /// Retrieves a configuration for a form key.
    /// </summary>
    /// <param name="key">Form key.</param>
    /// <returns>The matching configuration, if any.</returns>
    public RuntimeFormConfiguration? Find(string key)
    {
        return _forms.TryGetValue(key, out var configuration) ? configuration : null;
    }

    private static RuntimeFormConfiguration BuildConfiguration(RuntimeFormDefinition form)
    {
        return new RuntimeFormConfiguration
        {
            Key = form.Key,
            SourceUrl = form.SourceUrl,
            Action = form.Action,
            Method = form.Method,
            Enabled = false,
            Inputs = form.Inputs.Select(input => new RuntimeFormInputConfiguration
            {
                Name = input.Name,
                Type = input.Type,
                Label = input.Label,
                IsRequired = input.IsRequired,
                Options = input.Options,
                DefaultValue = input.DefaultValue,
                Value = null,
                IsNameGenerated = input.IsNameGenerated
            }).ToList()
        };
    }

    private static RuntimeFormConfiguration Merge(RuntimeFormConfiguration existing, RuntimeFormDefinition form)
    {
        var existingInputs = existing.Inputs.ToDictionary(input => input.Name, StringComparer.OrdinalIgnoreCase);
        var mergedInputs = new List<RuntimeFormInputConfiguration>();

        foreach (var input in form.Inputs)
        {
            if (existingInputs.TryGetValue(input.Name, out var prior))
            {
                mergedInputs.Add(new RuntimeFormInputConfiguration
                {
                    Name = input.Name,
                    Type = input.Type,
                    Label = input.Label,
                    IsRequired = input.IsRequired,
                    Options = input.Options,
                    DefaultValue = input.DefaultValue,
                    Value = prior.Value,
                    IsNameGenerated = input.IsNameGenerated
                });
                existingInputs.Remove(input.Name);
            }
            else
            {
                mergedInputs.Add(new RuntimeFormInputConfiguration
                {
                    Name = input.Name,
                    Type = input.Type,
                    Label = input.Label,
                    IsRequired = input.IsRequired,
                    Options = input.Options,
                    DefaultValue = input.DefaultValue,
                    Value = null,
                    IsNameGenerated = input.IsNameGenerated
                });
            }
        }

        foreach (var remaining in existingInputs.Values)
        {
            mergedInputs.Add(remaining);
        }

        return new RuntimeFormConfiguration
        {
            Key = existing.Key,
            SourceUrl = form.SourceUrl,
            Action = form.Action,
            Method = form.Method,
            Enabled = existing.Enabled,
            Inputs = mergedInputs
        };
    }

    private static bool ConfigurationsEqual(RuntimeFormConfiguration left, RuntimeFormConfiguration right)
    {
        if (!string.Equals(left.Key, right.Key, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(left.SourceUrl, right.SourceUrl, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(left.Action, right.Action, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(left.Method, right.Method, StringComparison.OrdinalIgnoreCase)
            || left.Enabled != right.Enabled)
        {
            return false;
        }

        if (left.Inputs.Count != right.Inputs.Count)
        {
            return false;
        }

        for (var i = 0; i < left.Inputs.Count; i++)
        {
            var leftInput = left.Inputs[i];
            var rightInput = right.Inputs[i];
            if (!string.Equals(leftInput.Name, rightInput.Name, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(leftInput.Type, rightInput.Type, StringComparison.OrdinalIgnoreCase)
                || !string.Equals(leftInput.Label, rightInput.Label, StringComparison.Ordinal)
                || leftInput.IsRequired != rightInput.IsRequired
                || leftInput.IsNameGenerated != rightInput.IsNameGenerated
                || !string.Equals(leftInput.DefaultValue, rightInput.DefaultValue, StringComparison.Ordinal)
                || !string.Equals(leftInput.Value, rightInput.Value, StringComparison.Ordinal))
            {
                return false;
            }

            if (leftInput.Options.Count != rightInput.Options.Count)
            {
                return false;
            }

            for (var optionIndex = 0; optionIndex < leftInput.Options.Count; optionIndex++)
            {
                if (!string.Equals(leftInput.Options[optionIndex], rightInput.Options[optionIndex], StringComparison.Ordinal))
                {
                    return false;
                }
            }
        }

        return true;
    }

    private sealed class RuntimeFormConfigurationSet
    {
        public IReadOnlyList<RuntimeFormConfiguration> Forms { get; init; } = Array.Empty<RuntimeFormConfiguration>();
    }
}
