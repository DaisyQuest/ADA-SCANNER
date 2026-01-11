const {
  extractStylesheetLinks,
  resolveStylesheetPath,
  resolveStylesheetUrl,
  stripQueryAndHash,
  isStylesheetRel
} = require("../src/utils/StylesheetLinks");

describe("StylesheetLinks", () => {
  test("strips query strings and hashes", () => {
    expect(stripQueryAndHash("styles.css?version=1#hash")).toBe("styles.css");
    expect(stripQueryAndHash("styles.css#hash?ignored")).toBe("styles.css");
    expect(stripQueryAndHash(null)).toBeNull();
  });

  test("detects stylesheet rel values", () => {
    expect(isStylesheetRel("stylesheet")).toBe(true);
    expect(isStylesheetRel("preload stylesheet")).toBe(true);
    expect(isStylesheetRel("preload")).toBe(false);
    expect(isStylesheetRel("")).toBe(false);
    expect(isStylesheetRel(null)).toBe(false);
  });

  test("resolves stylesheet paths from HTML files", () => {
    expect(resolveStylesheetPath({ href: "styles.css", basePath: "pages/index.html" }))
      .toBe("pages/styles.css");
    expect(resolveStylesheetPath({ href: "/assets/main.css", basePath: "pages/index.html" }))
      .toBe("assets/main.css");
    expect(resolveStylesheetPath({ href: "http://cdn.com/main.css", basePath: "pages/index.html" }))
      .toBeNull();
    expect(resolveStylesheetPath({ href: " ", basePath: "pages/index.html" })).toBeNull();
    expect(resolveStylesheetPath({ href: "//cdn.com/main.css", basePath: "pages/index.html" })).toBeNull();
    expect(resolveStylesheetPath({ href: "styles.css", basePath: "" })).toBeNull();
    expect(resolveStylesheetPath({ href: null, basePath: "pages/index.html" })).toBeNull();
  });

  test("resolves stylesheet URLs from runtime pages", () => {
    expect(resolveStylesheetUrl({ href: "/styles.css", baseUrl: "http://example/page" }))
      .toBe("http://example/styles.css");
    expect(resolveStylesheetUrl({ href: "mailto:test", baseUrl: "http://example/page" }))
      .toBeNull();
    expect(resolveStylesheetUrl({ href: " ", baseUrl: "http://example/page" })).toBeNull();
    expect(resolveStylesheetUrl({ href: "http://[invalid", baseUrl: "http://example/page" })).toBeNull();
    expect(resolveStylesheetUrl({ href: "styles.css", baseUrl: "" })).toBeNull();
    expect(resolveStylesheetUrl({ href: "styles.css", baseUrl: "ftp://example/page" })).toBeNull();
  });

  test("extracts linked stylesheets from HTML", () => {
    const content = `
      <link rel="stylesheet" href="styles.css" />
      <link rel="stylesheet" />
      <link rel="stylesheet" href=" " />
      <link rel="preload stylesheet" href="/theme.css?version=1#hash" />
      <link rel="preload" href="ignore.css" />
    `;

    const links = extractStylesheetLinks({ content, basePath: "pages/index.html" });
    expect(links).toEqual(["pages/styles.css", "theme.css"]);
  });

  test("extracts linked stylesheets from runtime base urls", () => {
    const content = "<link rel=\"stylesheet\" href=\"styles.css\" />";
    const links = extractStylesheetLinks({ content, baseUrl: "http://example/page" });
    expect(links).toEqual(["http://example/styles.css"]);
  });

  test("returns empty list when content is missing", () => {
    expect(extractStylesheetLinks({ content: null, basePath: "index.html" })).toEqual([]);
  });

  test("handles match objects without groups", () => {
    const originalMatchAll = String.prototype.matchAll;
    String.prototype.matchAll = () => [{ groups: null }][Symbol.iterator]();
    try {
      expect(extractStylesheetLinks({ content: "<link>", basePath: "index.html" })).toEqual([]);
    } finally {
      String.prototype.matchAll = originalMatchAll;
    }
  });
});
