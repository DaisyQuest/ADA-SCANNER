using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeCaptureExtensionExporterTests
{
    [Fact]
    public void ExportChromiumExtension_ThrowsOnNullOptions()
    {
        var exporter = new RuntimeCaptureExtensionExporter();

        var error = Assert.Throws<ArgumentNullException>(() =>
            exporter.ExportChromiumExtension(null!, "out"));

        Assert.Equal("options", error.ParamName);
    }

    [Fact]
    public void ExportChromiumExtension_ThrowsOnEmptyOutputDirectory()
    {
        var exporter = new RuntimeCaptureExtensionExporter();

        var error = Assert.Throws<ArgumentException>(() =>
            exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
            {
                CaptureUrl = "http://127.0.0.1:45892/capture"
            }, ""));

        Assert.Equal("outputDirectory", error.ParamName);
    }

    [Fact]
    public void ExportChromiumExtension_ThrowsOnMissingCaptureUrl()
    {
        var exporter = new RuntimeCaptureExtensionExporter();

        var error = Assert.Throws<ArgumentException>(() =>
            exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions(), "out"));

        Assert.Equal("options", error.ParamName);
    }

    [Fact]
    public void ExportChromiumExtension_ThrowsOnInvalidCaptureUrl()
    {
        var exporter = new RuntimeCaptureExtensionExporter();

        var error = Assert.Throws<ArgumentException>(() =>
            exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
            {
                CaptureUrl = "not-a-url"
            }, "out"));

        Assert.Equal("options", error.ParamName);
    }

    [Fact]
    public void ExportChromiumExtension_ThrowsOnUnsupportedScheme()
    {
        var exporter = new RuntimeCaptureExtensionExporter();

        var error = Assert.Throws<ArgumentException>(() =>
            exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
            {
                CaptureUrl = "ftp://example.test/capture"
            }, "out"));

        Assert.Equal("options", error.ParamName);
    }

    [Fact]
    public void ExportChromiumExtension_WritesManifestAndScript()
    {
        var root = TestUtilities.CreateTempDirectory();
        var output = Path.Combine(root, "extension");
        var exporter = new RuntimeCaptureExtensionExporter();

        exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
        {
            CaptureUrl = "http://127.0.0.1:45892/capture",
            AccessToken = "token",
            ExtensionName = "ADA Capture"
        }, output);

        var manifestPath = Path.Combine(output, "manifest.json");
        var backgroundPath = Path.Combine(output, "background.js");

        Assert.True(File.Exists(manifestPath));
        Assert.True(File.Exists(backgroundPath));

        var manifestContents = File.ReadAllText(manifestPath);
        Assert.Contains("\"name\": \"ADA Capture\"", manifestContents);
        Assert.Contains("\"manifest_version\": 3", manifestContents);

        var backgroundContents = File.ReadAllText(backgroundPath);
        Assert.Contains("http://127.0.0.1:45892/capture", backgroundContents);
        Assert.Contains("X-Ada-Scanner-Token", backgroundContents);
    }

    [Fact]
    public void ExportChromiumExtension_OmitsTokenHeaderWhenUnset()
    {
        var root = TestUtilities.CreateTempDirectory();
        var output = Path.Combine(root, "extension");
        var exporter = new RuntimeCaptureExtensionExporter();

        exporter.ExportChromiumExtension(new RuntimeCaptureExtensionOptions
        {
            CaptureUrl = "http://127.0.0.1:45892/capture"
        }, output);

        var backgroundContents = File.ReadAllText(Path.Combine(output, "background.js"));
        Assert.DoesNotContain("X-Ada-Scanner-Token\"", backgroundContents);
    }
}
