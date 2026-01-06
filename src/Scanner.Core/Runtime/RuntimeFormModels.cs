namespace Scanner.Core.Runtime;

/// <summary>
/// Represents a form input discovered in runtime HTML.
/// </summary>
/// <param name="Name">The field name used during submission.</param>
/// <param name="Type">The input type (text, password, select, textarea, etc.).</param>
/// <param name="Label">The visible label text, if any.</param>
/// <param name="IsRequired">Whether the input is required.</param>
/// <param name="Options">Options for select/radio inputs.</param>
/// <param name="DefaultValue">Default value found in markup.</param>
/// <param name="IsNameGenerated">Indicates whether the name was generated due to missing attributes.</param>
public sealed record RuntimeFormInputDefinition(
    string Name,
    string Type,
    string? Label,
    bool IsRequired,
    IReadOnlyList<string> Options,
    string? DefaultValue,
    bool IsNameGenerated);

/// <summary>
/// Represents a form discovered in runtime HTML.
/// </summary>
/// <param name="Key">Stable key derived from action, method, and inputs.</param>
/// <param name="SourceUrl">The URL where the form was discovered.</param>
/// <param name="Action">The absolute form action URL.</param>
/// <param name="Method">The HTTP method used for submission.</param>
/// <param name="Inputs">Inputs found within the form.</param>
public sealed record RuntimeFormDefinition(
    string Key,
    string SourceUrl,
    string Action,
    string Method,
    IReadOnlyList<RuntimeFormInputDefinition> Inputs);

/// <summary>
/// Represents a configurable input in the runtime form configuration.
/// </summary>
public sealed class RuntimeFormInputConfiguration
{
    /// <summary>
    /// Gets the field name used during submission.
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Gets the input type.
    /// </summary>
    public string Type { get; init; } = "text";

    /// <summary>
    /// Gets the visible label text, if any.
    /// </summary>
    public string? Label { get; init; }

    /// <summary>
    /// Gets a value indicating whether the input is required.
    /// </summary>
    public bool IsRequired { get; init; }

    /// <summary>
    /// Gets the options for select/radio inputs.
    /// </summary>
    public IReadOnlyList<string> Options { get; init; } = Array.Empty<string>();

    /// <summary>
    /// Gets the default value from the HTML markup.
    /// </summary>
    public string? DefaultValue { get; init; }

    /// <summary>
    /// Gets the configured submission value for this input.
    /// </summary>
    public string? Value { get; init; }

    /// <summary>
    /// Gets a value indicating whether the name was generated due to missing attributes.
    /// </summary>
    public bool IsNameGenerated { get; init; }
}

/// <summary>
/// Represents a configured form for runtime submission.
/// </summary>
public sealed class RuntimeFormConfiguration
{
    /// <summary>
    /// Gets the stable key for the form.
    /// </summary>
    public string Key { get; init; } = string.Empty;

    /// <summary>
    /// Gets the URL where the form was discovered.
    /// </summary>
    public string SourceUrl { get; init; } = string.Empty;

    /// <summary>
    /// Gets the form action URL.
    /// </summary>
    public string Action { get; init; } = string.Empty;

    /// <summary>
    /// Gets the HTTP method used for submission.
    /// </summary>
    public string Method { get; init; } = "GET";

    /// <summary>
    /// Gets a value indicating whether the form is enabled for auto-submission.
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// Gets the input configurations for the form.
    /// </summary>
    public IReadOnlyList<RuntimeFormInputConfiguration> Inputs { get; init; } = Array.Empty<RuntimeFormInputConfiguration>();
}
