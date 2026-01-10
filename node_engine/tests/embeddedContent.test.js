const { extractEmbeddedContent, buildPaddedContent } = require("../src/static/EmbeddedContent");

describe("EmbeddedContent", () => {
  test("extracts HTML and CSS from string literals while ignoring comments", () => {
    const content = [
      "// \"<div>ignored</div>\"",
      "/* \"body { color: red; }\" */",
      "const html = '<div class=\"item\"></div>';",
      "const css = \"body { color: red; }\";",
      "const empty = \"\";"
    ].join("\n");

    const snippets = extractEmbeddedContent(content);

    expect(snippets).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "html", content: "<div class=\"item\"></div>" }),
      expect.objectContaining({ kind: "css", content: "body { color: red; }" })
    ]));
    expect(snippets).toHaveLength(2);
  });

  test("captures escaped characters in quoted strings", () => {
    const content = "const html = '<div class=\\\\'item\\\\'></div>';";

    const snippets = extractEmbeddedContent(content);

    expect(snippets).toHaveLength(1);
    expect(snippets[0].content).toContain("\\\\");
    expect(snippets[0].content).toContain("<div class=");
  });

  test("extracts template literals with interpolations and nested templates", () => {
    const content = [
      "const template = `",
      "<div>",
      "${items.map(item => `",
      "<span>${item}</span>",
      "`).join(\"\")}",
      "<style>",
      ".item { color: red; }",
      "</style>",
      "${`line1\nline2`}",
      "</div>",
      "`;"
    ].join("\n");

    const snippets = extractEmbeddedContent(content);
    const htmlSnippet = snippets.find((snippet) => snippet.kind === "html");
    const cssSnippet = snippets.find((snippet) => snippet.kind === "css");

    expect(htmlSnippet.content).toContain("<div>");
    expect(htmlSnippet.content).toContain("</div>");
    expect(htmlSnippet.content).toContain("<style>");
    expect(cssSnippet.content).toContain(".item { color: red; }");
  });

  test("extracts HTML and CSS from the same literal", () => {
    const content = "const template = `<style>.a { color: blue; }</style>`;";

    const snippets = extractEmbeddedContent(content);

    expect(snippets.map((snippet) => snippet.kind).sort()).toEqual(["css", "html"]);
  });

  test("returns empty results for unterminated comments", () => {
    expect(extractEmbeddedContent("// incomplete comment")).toEqual([]);
    expect(extractEmbeddedContent("/* incomplete comment")).toEqual([]);
  });

  test("buildPaddedContent preserves line offsets", () => {
    const content = "line1\nline2\n`<div></div>`";
    const startIndex = content.indexOf("<div>");

    expect(buildPaddedContent(content, startIndex, "<div></div>")).toBe("\n\n<div></div>");
  });

  test("handles nested braces and escaped strings inside template expressions", () => {
    const content = [
      "const template = `",
      "<div>\\\\</div>",
      "${({",
      "  text: 'esc\\\\aped',",
      "  nested: { value: 1 }",
      "})}",
      "</div>",
      "`;"
    ].join("\n");

    const snippets = extractEmbeddedContent(content);
    const htmlSnippet = snippets.find((snippet) => snippet.kind === "html");

    expect(htmlSnippet.content).toContain("<div>");
    expect(htmlSnippet.content).toContain("</div>");
  });
});
