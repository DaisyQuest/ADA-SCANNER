using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeFormConfigurationStoreTests
{
    [Fact]
    public void Store_SavesAndLoadsConfiguration()
    {
        var temp = TestUtilities.CreateTempDirectory();
        var path = Path.Combine(temp, "forms.json");
        var store = new RuntimeFormConfigurationStore();

        var form = new RuntimeFormDefinition(
            "POST::http://example.test/login::password,user",
            "http://example.test/login",
            "http://example.test/login",
            "POST",
            new[]
            {
                new RuntimeFormInputDefinition("user", "text", "User", true, Array.Empty<string>(), null, false),
                new RuntimeFormInputDefinition("password", "password", null, true, Array.Empty<string>(), null, false)
            });

        store.RegisterDiscoveredForms(new[] { form });
        Assert.True(store.IsDirty);
        store.Save(path);

        var loaded = RuntimeFormConfigurationStore.Load(path);
        Assert.Single(loaded.Forms);
        Assert.Equal("http://example.test/login", loaded.Forms[0].Action);
        Assert.False(loaded.IsDirty);
    }

    [Fact]
    public void Store_MergesValuesWhenFormsChange()
    {
        var temp = TestUtilities.CreateTempDirectory();
        var path = Path.Combine(temp, "forms.json");
        File.WriteAllText(path, """
            {
              "forms": [
                {
                  "key": "POST::http://example.test/login::password,user",
                  "sourceUrl": "http://example.test/login",
                  "action": "http://example.test/login",
                  "method": "POST",
                  "enabled": true,
                  "inputs": [
                    { "name": "user", "type": "text", "value": "ada" },
                    { "name": "password", "type": "password", "value": "secret" }
                  ]
                }
              ]
            }
            """);

        var store = RuntimeFormConfigurationStore.Load(path);
        var updated = new RuntimeFormDefinition(
            "POST::http://example.test/login::password,user",
            "http://example.test/login",
            "http://example.test/login",
            "POST",
            new[]
            {
                new RuntimeFormInputDefinition("user", "text", "Username", true, Array.Empty<string>(), null, false),
                new RuntimeFormInputDefinition("password", "password", null, true, Array.Empty<string>(), null, false)
            });

        store.RegisterDiscoveredForms(new[] { updated });

        var merged = store.Forms[0];
        Assert.True(merged.Enabled);
        Assert.Equal("ada", merged.Inputs.First(input => input.Name == "user").Value);
        Assert.Equal("Username", merged.Inputs.First(input => input.Name == "user").Label);
    }

    [Fact]
    public void Store_DoesNotMarkDirtyWhenNoChangesDetected()
    {
        var store = new RuntimeFormConfigurationStore();
        var form = new RuntimeFormDefinition(
            "POST::http://example.test/login::password,user",
            "http://example.test/login",
            "http://example.test/login",
            "POST",
            new[]
            {
                new RuntimeFormInputDefinition("user", "text", "User", true, Array.Empty<string>(), null, false),
                new RuntimeFormInputDefinition("password", "password", null, true, Array.Empty<string>(), null, false)
            });

        store.RegisterDiscoveredForms(new[] { form });
        store.Save(Path.Combine(TestUtilities.CreateTempDirectory(), "forms.json"));
        Assert.False(store.IsDirty);

        store.RegisterDiscoveredForms(new[] { form });
        Assert.False(store.IsDirty);
    }

    [Fact]
    public void Store_SaveCreatesDirectory()
    {
        var temp = TestUtilities.CreateTempDirectory();
        var nested = Path.Combine(temp, "nested");
        var path = Path.Combine(nested, "forms.json");
        var store = new RuntimeFormConfigurationStore();

        store.Save(path);

        Assert.True(File.Exists(path));
    }
}
