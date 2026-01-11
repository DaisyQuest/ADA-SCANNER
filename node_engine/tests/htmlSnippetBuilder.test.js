const { buildHtmlSnippet } = require("../src/utils/HtmlSnippetBuilder");

describe("HtmlSnippetBuilder", () => {
  test("wraps plain HTML fragments", () => {
    const snippet = buildHtmlSnippet({ content: "<main>Hi</main>", kind: "html" });
    expect(snippet.html).toContain("<main>Hi</main>");
    expect(snippet.html).toContain("<html");
    expect(snippet.kind).toBe("html");
    expect(snippet.sourceKind).toBe("html");
    expect(snippet.contentType).toBe("text/html");
  });

  test("returns HTML content as-is when already wrapped", () => {
    const html = "<!doctype html><html><body>Hi</body></html>";
    const snippet = buildHtmlSnippet({ content: html, kind: "html" });
    expect(snippet.html).toBe(html);
  });

  test("builds css wrapper", () => {
    const snippet = buildHtmlSnippet({ content: "a:focus{outline:none}", kind: "css" });
    expect(snippet.kind).toBe("css");
    expect(snippet.html).toContain("<style>");
    expect(snippet.html).toContain("a:focus{outline:none}");
    expect(snippet.contentType).toBe("text/html");
  });

  test("builds js wrapper", () => {
    const snippet = buildHtmlSnippet({ content: "setTimeout(() => {}, 10);", kind: "js" });
    expect(snippet.kind).toBe("js");
    expect(snippet.html).toContain("<script>");
    expect(snippet.html).toContain("setTimeout");
    expect(snippet.contentType).toBe("text/html");
  });

  test("renders freemarker content", () => {
    const snippet = buildHtmlSnippet({ content: "<@card>Body ${name}</@card>", kind: "ftl" });
    expect(snippet.kind).toBe("html");
    expect(snippet.sourceKind).toBe("ftl");
    expect(snippet.html).toContain("data-freemarker-macro=\"card\"");
    expect(snippet.html).toContain("freemarker");
    expect(snippet.contentType).toBe("text/html");
  });

  test("preserves cshtml kind", () => {
    const snippet = buildHtmlSnippet({ content: "<div>@Model.Name</div>", kind: "cshtml" });
    expect(snippet.kind).toBe("cshtml");
    expect(snippet.sourceKind).toBe("cshtml");
    expect(snippet.html).toContain("<div>@Model.Name</div>");
  });

  test("falls back for unknown kinds", () => {
    const snippet = buildHtmlSnippet({ content: "<section>Unknown</section>", kind: "xml" });
    expect(snippet.kind).toBe("html");
    expect(snippet.sourceKind).toBe("xml");
    expect(snippet.html).toContain("<section>Unknown</section>");
    expect(snippet.contentType).toBe("text/html");
  });

  test("defaults to empty html when no args provided", () => {
    const snippet = buildHtmlSnippet();
    expect(snippet.kind).toBe("html");
    expect(snippet.html).toContain("<html");
  });

  test("normalizes kind and content values", () => {
    const snippet = buildHtmlSnippet({ content: 42, kind: "HTML" });
    expect(snippet.kind).toBe("html");
    expect(snippet.sourceKind).toBe("html");
    expect(snippet.html).toContain("42");
  });

  test("maps htm kinds to html source", () => {
    const snippet = buildHtmlSnippet({ content: "<p>Hi</p>", kind: "htm" });
    expect(snippet.kind).toBe("htm");
    expect(snippet.sourceKind).toBe("html");
    expect(snippet.contentType).toBe("text/html");
  });

  test("normalizes null values for kind and content", () => {
    const snippet = buildHtmlSnippet({ content: null, kind: null });
    expect(snippet.kind).toBe("html");
    expect(snippet.sourceKind).toBe("html");
    expect(snippet.html).toContain("<body></body>");
  });
});
