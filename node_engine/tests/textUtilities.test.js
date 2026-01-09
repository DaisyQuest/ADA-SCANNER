const { getLineNumberForSnippet } = require("../src/checks/TextUtilities");

describe("TextUtilities", () => {
  test("returns line number for snippets and falls back", () => {
    const content = "line1\nline2\nline3";
    expect(getLineNumberForSnippet(content, "line2")).toBe(2);
    expect(getLineNumberForSnippet(content, "missing", 12)).toBe(3);
    expect(getLineNumberForSnippet(content, "missing", 0)).toBe(1);
    expect(getLineNumberForSnippet("", "line1")).toBe(1);
  });
});
