using Scanner.Core.Runtime;
using Xunit;

namespace Scanner.Tests;

public sealed class RuntimeFormExtractorTests
{
    [Fact]
    public void Extract_ReturnsEmptyWhenHtmlMissing()
    {
        var extractor = new RuntimeFormExtractor();

        var forms = extractor.Extract(string.Empty, new Uri("http://example.test"));

        Assert.Empty(forms);
    }

    [Fact]
    public void Extract_PullsFormMetadataAndInputs()
    {
        var html = """
            <form action="/submit" method="post">
              <label for="user">User Name</label>
              <input id="user" name="username" type="text" value="ada" />
              <input name="password" type="password" aria-required="true" />
              <select name="role">
                <option value="admin">Admin</option>
                <option value="reader">Reader</option>
              </select>
              <textarea name="note">hello</textarea>
              <input type="text" />
            </form>
            """;

        var extractor = new RuntimeFormExtractor();
        var forms = extractor.Extract(html, new Uri("http://example.test/login"));

        Assert.Single(forms);
        var form = forms[0];
        Assert.Equal("http://example.test/submit", form.Action);
        Assert.Equal("POST", form.Method);
        Assert.Equal(5, form.Inputs.Count);

        var user = form.Inputs[0];
        Assert.Equal("username", user.Name);
        Assert.Equal("text", user.Type);
        Assert.Equal("User Name", user.Label);
        Assert.Equal("ada", user.DefaultValue);

        var password = form.Inputs[1];
        Assert.True(password.IsRequired);

        var role = form.Inputs[2];
        Assert.Equal("select", role.Type);
        Assert.Contains("admin", role.Options);

        var note = form.Inputs[3];
        Assert.Equal("textarea", note.Type);
        Assert.Equal("hello", note.DefaultValue);

        var unnamed = form.Inputs[4];
        Assert.StartsWith("unnamed-", unnamed.Name, StringComparison.OrdinalIgnoreCase);
        Assert.True(unnamed.IsNameGenerated);
    }

    [Fact]
    public void Extract_UsesAriaLabelAndPlaceholder()
    {
        var html = """
            <form action="/search">
              <input name="query" aria-label="Search term" />
              <input name="location" placeholder="ZIP code" />
            </form>
            """;

        var extractor = new RuntimeFormExtractor();
        var forms = extractor.Extract(html, new Uri("http://example.test"));

        var inputs = forms.Single().Inputs;
        Assert.Equal("Search term", inputs[0].Label);
        Assert.Equal("ZIP code", inputs[1].Label);
    }
}
