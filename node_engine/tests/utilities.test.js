const { getAttributeValue } = require("../src/checks/AttributeParser");
const {
  collectLabelForIds,
  collectLabelRanges,
  collectElementIds,
  isWithinLabel,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasLabelForId,
  hasTextContent
} = require("../src/checks/AccessibleNameUtilities");
const { getLineNumber, containsAttribute } = require("../src/checks/TextUtilities");
const { getLastPropertyValue, isFixedLength } = require("../src/checks/StyleUtilities");
const { tryParseHex, contrastRatio } = require("../src/checks/ColorContrastAnalyzer");

describe("AttributeParser", () => {
  test("extracts attribute values case-insensitively", () => {
    const attrs = 'id="main" data-test="value"';
    expect(getAttributeValue(attrs, "ID")).toBe("main");
    expect(getAttributeValue(attrs, "data-test")).toBe("value");
  });

  test("returns null when attribute missing", () => {
    expect(getAttributeValue("", "id")).toBeNull();
    expect(getAttributeValue("class=\"test\"", "id")).toBeNull();
  });
});

describe("AccessibleNameUtilities", () => {
  const markup = '<label for="name">Name</label><input id="name" />';

  test("collects label ids and element ids", () => {
    expect(collectLabelForIds(markup)).toEqual(new Set(["name"]));
    expect(collectElementIds(markup)).toEqual(new Set(["name"]));
  });

  test("detects label ranges and membership", () => {
    const ranges = collectLabelRanges(markup);
    expect(ranges).toHaveLength(1);
    expect(isWithinLabel(ranges[0].start + 1, ranges)).toBe(true);
    expect(isWithinLabel(ranges[0].end + 1, ranges)).toBe(false);
  });

  test("validates aria labels and titles", () => {
    expect(hasAriaLabel("label")).toBe(true);
    expect(hasAriaLabel(" ")).toBe(false);
    expect(hasTitle("title")).toBe(true);
  });

  test("validates aria-labelledby references", () => {
    const ids = new Set(["label-one"]);
    expect(hasValidAriaLabelledBy("label-one", ids)).toBe(true);
    expect(hasValidAriaLabelledBy("missing", ids)).toBe(false);
    expect(hasValidAriaLabelledBy("", ids)).toBe(false);
  });

  test("validates label for id and text content", () => {
    const ids = new Set(["main"]);
    expect(hasLabelForId("main", ids)).toBe(true);
    expect(hasLabelForId("other", ids)).toBe(false);
    expect(hasTextContent("<span>Text</span>")).toBe(true);
    expect(hasTextContent("<span> </span>")).toBe(false);
  });
});

describe("TextUtilities", () => {
  test("gets line number for indexes", () => {
    const content = "line1\nline2\nline3";
    expect(getLineNumber(content, 0)).toBe(1);
    expect(getLineNumber(content, 6)).toBe(2);
    expect(getLineNumber(content, content.length)).toBe(3);
  });

  test("detects attributes with optional boolean syntax", () => {
    expect(containsAttribute("hidden", "hidden", true)).toBe(true);
    expect(containsAttribute("hidden=\"hidden\"", "hidden", true)).toBe(true);
    expect(containsAttribute("hidden=\"hidden\"", "hidden", false)).toBe(true);
    expect(containsAttribute("", "hidden", true)).toBe(false);
  });
});

describe("StyleUtilities", () => {
  test("gets last property value", () => {
    const style = "width: 10px; width: 20px;";
    expect(getLastPropertyValue(style, "width")).toBe("20px");
    expect(getLastPropertyValue(style, "height")).toBeNull();
  });

  test("identifies fixed lengths", () => {
    expect(isFixedLength("10px")).toBe(true);
    expect(isFixedLength("0px")).toBe(false);
    expect(isFixedLength("50%")) .toBe(false);
    expect(isFixedLength("auto")).toBe(false);
    expect(isFixedLength("abc")).toBe(false);
  });
});

describe("ColorContrastAnalyzer", () => {
  test("parses hex colors", () => {
    expect(tryParseHex("#fff")).toEqual({ r: 1, g: 1, b: 1 });
    expect(tryParseHex("#0f08")).toEqual({ r: 1, g: 0, b: 0.5333333333333333 });
    expect(tryParseHex("#001122")).toEqual({ r: 0, g: 17 / 255, b: 34 / 255 });
    expect(tryParseHex("#ff001122")).toEqual({ r: 0, g: 17 / 255, b: 34 / 255 });
    expect(tryParseHex("")).toBeNull();
    expect(tryParseHex("zzzz")).toBeNull();
  });

  test("calculates contrast ratio", () => {
    const white = { r: 1, g: 1, b: 1 };
    const black = { r: 0, g: 0, b: 0 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
  });
});
