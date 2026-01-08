using System.Text.Json;
using System.Text.Json.Serialization;

namespace Scanner.Core.Runtime;

/// <summary>
/// Exports a Chromium extension that captures HTML and posts it to a runtime listener.
/// </summary>
public sealed class RuntimeCaptureExtensionExporter
{
    private static readonly JsonSerializerOptions ManifestSerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Writes a Chromium extension bundle for runtime capture.
    /// </summary>
    /// <param name="options">Extension export options.</param>
    /// <param name="outputDirectory">Directory to write the extension bundle into.</param>
    public void ExportChromiumExtension(RuntimeCaptureExtensionOptions options, string outputDirectory)
    {
        if (options == null)
        {
            throw new ArgumentNullException(nameof(options));
        }

        if (string.IsNullOrWhiteSpace(outputDirectory))
        {
            throw new ArgumentException("Output directory is required.", nameof(outputDirectory));
        }

        if (string.IsNullOrWhiteSpace(options.CaptureUrl))
        {
            throw new ArgumentException("Capture URL is required.", nameof(options));
        }

        if (!Uri.TryCreate(options.CaptureUrl, UriKind.Absolute, out var captureUri))
        {
            throw new ArgumentException("Capture URL must be absolute.", nameof(options));
        }

        if (!captureUri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            && !captureUri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Capture URL must use http or https.", nameof(options));
        }

        Directory.CreateDirectory(outputDirectory);

        var manifest = new Dictionary<string, object>
        {
            ["manifest_version"] = 3,
            ["name"] = options.ExtensionName,
            ["version"] = options.ExtensionVersion,
            ["description"] = options.Description,
            ["permissions"] = new[] { "activeTab", "scripting" },
            ["host_permissions"] = new[] { "http://127.0.0.1/*", "http://localhost/*" },
            ["background"] = new Dictionary<string, object>
            {
                ["service_worker"] = "background.js"
            },
            ["action"] = new Dictionary<string, object>
            {
                ["default_title"] = "Capture page for ADA Scanner"
            }
        };

        var manifestPath = Path.Combine(outputDirectory, "manifest.json");
        File.WriteAllText(manifestPath, JsonSerializer.Serialize(manifest, ManifestSerializerOptions));

        var backgroundPath = Path.Combine(outputDirectory, "background.js");
        File.WriteAllText(backgroundPath, BuildBackgroundScript(options));
    }

    private static string BuildBackgroundScript(RuntimeCaptureExtensionOptions options)
    {
        var tokenLiteral = string.IsNullOrWhiteSpace(options.AccessToken)
            ? null
            : options.AccessToken.Replace("\\", "\\\\").Replace("\"", "\\\"");
        var urlLiteral = options.CaptureUrl.Replace("\\", "\\\\").Replace("\"", "\\\"");
        var tokenConstant = tokenLiteral == null ? string.Empty : $"const ACCESS_TOKEN = \"{tokenLiteral}\";\n";
        var tokenHeader = tokenLiteral == null
            ? string.Empty
            : "  headers[\"X-Ada-Scanner-Token\"] = ACCESS_TOKEN;\n";

        return $$"""
const CAPTURE_URL = "{{urlLiteral}}";
{{tokenConstant}}

async function postCapture() {
  console.info("ADA Scanner capture: collecting DOM.");
  const payload = {
    url: window.location.href,
    html: document.documentElement.outerHTML,
    contentType: "text/html",
    statusCode: 200
  };

  const headers = { "Content-Type": "application/json" };
{{tokenHeader}}

  console.info(`ADA Scanner capture: posting to ${CAPTURE_URL}.`);
  const response = await fetch(CAPTURE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  console.info(`ADA Scanner capture: response ${response.status}.`);
  return { ok: response.ok, status: response.status };
}

chrome.action.onClicked.addListener(async (tab) => {
  console.info("ADA Scanner capture: action clicked.");
  if (!tab.id) {
    console.warn("ADA Scanner capture: no active tab.");
    return;
  }

  try {
    console.info("ADA Scanner capture: injecting capture script.");
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: postCapture
    });
    console.info("ADA Scanner capture: capture script executed.");
  } catch (error) {
    console.error("ADA Scanner capture failed", error);
  }
});
""";
    }
}

/// <summary>
/// Options for exporting a runtime capture extension.
/// </summary>
public sealed class RuntimeCaptureExtensionOptions
{
    /// <summary>
    /// Gets the capture URL that receives HTML snapshots.
    /// </summary>
    public string CaptureUrl { get; init; } = string.Empty;

    /// <summary>
    /// Gets the optional access token for the capture listener.
    /// </summary>
    public string? AccessToken { get; init; }

    /// <summary>
    /// Gets the extension display name.
    /// </summary>
    public string ExtensionName { get; init; } = "ADA Scanner Capture";

    /// <summary>
    /// Gets the extension version.
    /// </summary>
    public string ExtensionVersion { get; init; } = "1.0.0";

    /// <summary>
    /// Gets the extension description.
    /// </summary>
    public string Description { get; init; } = "Capture HTML for ADA Scanner runtime scans.";
}
