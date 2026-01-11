const {
  getLineNumber,
  getLineNumberForSnippet,
  containsAttribute
} = require("../src/checks/TextUtilities");

describe("TextUtilities", () => {
  test("returns line number for snippets and falls back", () => {
    const content = "line1\nline2\nline3";
    expect(getLineNumberForSnippet(content, "line2")).toBe(2);
    expect(getLineNumberForSnippet(content, "missing", 12)).toBe(3);
    expect(getLineNumberForSnippet(content, "missing", 0)).toBe(1);
    expect(getLineNumberForSnippet("", "line1")).toBe(1);
  });

  test("calculates line numbers for indexes", () => {
    const content = "line1\nline2\nline3\n";
    expect(getLineNumber(content, 0)).toBe(1);
    expect(getLineNumber(content, 5)).toBe(2);
    expect(getLineNumber(content, 6)).toBe(2);
    expect(getLineNumber(content, content.length - 1)).toBe(4);
  });

  test("handles missing content for line numbers", () => {
    expect(getLineNumber(null, 10)).toBe(1);
    expect(getLineNumber(undefined, 0)).toBe(1);
  });

  test("detects attributes with or without boolean allowance", () => {
    const attrs = 'disabled aria-label="Name" data-value="x"';
    expect(containsAttribute(attrs, "disabled")).toBe(false);
    expect(containsAttribute(attrs, "disabled", true)).toBe(true);
    expect(containsAttribute(attrs, "aria-label")).toBe(true);
    expect(containsAttribute(attrs, "data-value")).toBe(true);
  });

  test("returns false when attribute names are missing", () => {
    expect(containsAttribute("", "disabled")).toBe(false);
    expect(containsAttribute("disabled", "")).toBe(false);
    expect(containsAttribute(null, "disabled")).toBe(false);
  });

  test("matches boolean attributes with special characters", () => {
    expect(containsAttribute("data.test value", "data.test", true)).toBe(true);
    expect(containsAttribute("data-test value", "data.test", true)).toBe(false);
  });
});
