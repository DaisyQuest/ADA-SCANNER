using HtmlAgilityPack;
using System.Text;

namespace Scanner.Core.Runtime;

/// <summary>
/// Extracts form definitions from runtime HTML.
/// </summary>
public sealed class RuntimeFormExtractor
{
    /// <summary>
    /// Extracts forms and input definitions from HTML.
    /// </summary>
    /// <param name="html">The HTML body.</param>
    /// <param name="baseUrl">The base URL used to resolve relative form actions.</param>
    /// <returns>Discovered form definitions.</returns>
    public IReadOnlyList<RuntimeFormDefinition> Extract(string html, Uri baseUrl)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return Array.Empty<RuntimeFormDefinition>();
        }

        var document = new HtmlDocument();
        document.LoadHtml(html);

        var forms = document.DocumentNode.SelectNodes("//form");
        if (forms == null || forms.Count == 0)
        {
            return Array.Empty<RuntimeFormDefinition>();
        }

        var results = new List<RuntimeFormDefinition>();
        foreach (var form in forms)
        {
            var actionValue = form.GetAttributeValue("action", string.Empty);
            var action = ResolveAction(baseUrl, actionValue);
            var method = form.GetAttributeValue("method", "get").Trim();
            if (string.IsNullOrWhiteSpace(method))
            {
                method = "get";
            }

            var inputNodes = form.SelectNodes(".//input|.//textarea|.//select");
            var inputs = new List<RuntimeFormInputDefinition>();
            if (inputNodes != null)
            {
                var unnamedIndex = 0;
                foreach (var input in inputNodes)
                {
                    var name = input.GetAttributeValue("name", string.Empty).Trim();
                    var id = input.GetAttributeValue("id", string.Empty).Trim();
                    var isNameGenerated = false;
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        name = !string.IsNullOrWhiteSpace(id) ? id : $"unnamed-{unnamedIndex++}";
                        isNameGenerated = true;
                    }

                    var type = input.Name.Equals("textarea", StringComparison.OrdinalIgnoreCase)
                        ? "textarea"
                        : input.Name.Equals("select", StringComparison.OrdinalIgnoreCase)
                            ? "select"
                            : input.GetAttributeValue("type", "text").Trim().ToLowerInvariant();

                    var label = ResolveLabelText(form, input, id);
                    var isRequired = input.Attributes.Contains("required")
                        || string.Equals(input.GetAttributeValue("aria-required", string.Empty), "true", StringComparison.OrdinalIgnoreCase);
                    var options = ExtractOptions(input);
                    var defaultValue = ExtractDefaultValue(input);

                    inputs.Add(new RuntimeFormInputDefinition(
                        name,
                        type,
                        label,
                        isRequired,
                        options,
                        defaultValue,
                        isNameGenerated));
                }
            }

            var key = BuildFormKey(action, method, inputs);
            results.Add(new RuntimeFormDefinition(key, baseUrl.ToString(), action, method.ToUpperInvariant(), inputs));
        }

        return results;
    }

    private static string ResolveAction(Uri baseUrl, string actionValue)
    {
        if (string.IsNullOrWhiteSpace(actionValue))
        {
            return baseUrl.ToString();
        }

        if (Uri.TryCreate(baseUrl, actionValue, out var actionUri))
        {
            return actionUri.ToString();
        }

        return baseUrl.ToString();
    }

    private static string? ResolveLabelText(HtmlNode form, HtmlNode input, string id)
    {
        if (!string.IsNullOrWhiteSpace(id))
        {
            var labelNode = form.SelectSingleNode($".//label[@for='{id}']");
            if (labelNode != null)
            {
                return NormalizeLabel(labelNode.InnerText);
            }
        }

        if (input.ParentNode != null && input.ParentNode.Name.Equals("label", StringComparison.OrdinalIgnoreCase))
        {
            return NormalizeLabel(input.ParentNode.InnerText);
        }

        var ariaLabel = input.GetAttributeValue("aria-label", string.Empty);
        if (!string.IsNullOrWhiteSpace(ariaLabel))
        {
            return ariaLabel.Trim();
        }

        var placeholder = input.GetAttributeValue("placeholder", string.Empty);
        if (!string.IsNullOrWhiteSpace(placeholder))
        {
            return placeholder.Trim();
        }

        return null;
    }

    private static string NormalizeLabel(string label)
    {
        var trimmed = label.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(trimmed.Length);
        var whitespace = false;
        foreach (var ch in trimmed)
        {
            if (char.IsWhiteSpace(ch))
            {
                if (!whitespace)
                {
                    builder.Append(' ');
                    whitespace = true;
                }

                continue;
            }

            whitespace = false;
            builder.Append(ch);
        }

        return builder.ToString();
    }

    private static IReadOnlyList<string> ExtractOptions(HtmlNode input)
    {
        if (!input.Name.Equals("select", StringComparison.OrdinalIgnoreCase))
        {
            return Array.Empty<string>();
        }

        var options = input.SelectNodes(".//option");
        if (options == null)
        {
            return Array.Empty<string>();
        }

        return options
            .Select(option => option.GetAttributeValue("value", option.InnerText).Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToList();
    }

    private static string? ExtractDefaultValue(HtmlNode input)
    {
        if (input.Name.Equals("textarea", StringComparison.OrdinalIgnoreCase))
        {
            var text = input.InnerText;
            return string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        }

        var value = input.GetAttributeValue("value", string.Empty).Trim();
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    private static string BuildFormKey(string action, string method, IReadOnlyList<RuntimeFormInputDefinition> inputs)
    {
        var inputNames = inputs
            .Select(input => input.Name)
            .Order(StringComparer.OrdinalIgnoreCase);

        return $"{method.ToUpperInvariant()}::{action}::" + string.Join(",", inputNames);
    }
}
