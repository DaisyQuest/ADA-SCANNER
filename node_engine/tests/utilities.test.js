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
const { parseHexColor, parseColor, contrastRatio } = require("../src/checks/ColorContrastAnalyzer");

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
    expect(collectLabelForIds('<label for=""></label>')).toEqual(new Set());
    expect(collectElementIds('<div id=""></div>')).toEqual(new Set());
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
    expect(hasValidAriaLabelledBy("label-one missing", ids)).toBe(true);
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
    expect(getLineNumber(content, 5)).toBe(2);
  });

  test("detects attributes with optional boolean syntax", () => {
    expect(containsAttribute("hidden", "hidden", true)).toBe(true);
    expect(containsAttribute("hidden=\"hidden\"", "hidden", true)).toBe(true);
    expect(containsAttribute("hidden=\"hidden\"", "hidden", false)).toBe(true);
    expect(containsAttribute("", "hidden", true)).toBe(false);
    expect(containsAttribute(null, "hidden", true)).toBe(false);
    expect(containsAttribute("hidden", "", false)).toBe(false);
  });
});

describe("StyleUtilities", () => {
  test("gets last property value", () => {
    const style = "width: 10px; width: 20px;";
    expect(getLastPropertyValue(style, "width")).toBe("20px");
    expect(getLastPropertyValue(style, "height")).toBeNull();
    expect(getLastPropertyValue("", "width")).toBeNull();
    expect(getLastPropertyValue("width 10px", "width")).toBeNull();
    expect(getLastPropertyValue("width:", "width")).toBeNull();
    expect(getLastPropertyValue("width: 10px", "")).toBeNull();
  });

  test("identifies fixed lengths", () => {
    expect(isFixedLength("10px")).toBe(true);
    expect(isFixedLength("0px")).toBe(false);
    expect(isFixedLength("-1px")).toBe(false);
    expect(isFixedLength("50%")) .toBe(false);
    expect(isFixedLength("auto")).toBe(false);
    expect(isFixedLength("abc")).toBe(false);
  });
});

describe("ColorContrastAnalyzer", () => {
  test("parses hex colors", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
    expect(parseHexColor("#0f08")).toEqual({ r: 0, g: 1, b: 0, a: 0.5333333333333333 });
    expect(parseHexColor("#001122")).toEqual({ r: 0, g: 17 / 255, b: 34 / 255, a: 1 });
    expect(parseHexColor("#ff001122", { alphaPosition: "start" })).toEqual({ r: 0, g: 17 / 255, b: 34 / 255, a: 1 });
    expect(parseHexColor("#001122ff", { alphaPosition: "end" })).toEqual({ r: 0, g: 17 / 255, b: 34 / 255, a: 1 });
    expect(parseHexColor("abc")).toEqual({ r: 0xaa / 255, g: 0xbb / 255, b: 0xcc / 255, a: 1 });
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor("zzzz")).toBeNull();
  });

  test("parses rgb and hsl colors", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseColor("rgb(100%, 0%, 0%)")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseColor("rgba(0, 0, 0, 50%)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor("rgba(0, 0, 0, 2)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("hsl(120, 100%, 25%)")).toEqual({ r: 0, g: 0.5, b: 0, a: 1 });
    expect(parseColor("hsla(0, 0%, 0%, 0.25)")).toEqual({ r: 0, g: 0, b: 0, a: 0.25 });
    expect(parseColor("hsl(30, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(90, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(150, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(210, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(270, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(330, 100%, 50%)")).not.toBeNull();
    expect(parseColor("hsl(-30, 100%, 50%)")).not.toBeNull();
    expect(parseColor("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor("unknown")).toBeNull();
    expect(parseColor("rgba(1, 2)")).toBeNull();
    expect(parseColor("rgb(, 0, 0)")).toBeNull();
    expect(parseColor("rgb(%, 0, 0)")).toBeNull();
    expect(parseColor("rgba(0, 0, 0, %)")).toBeNull();
    expect(parseColor("hsl(bad, 0%, 0%)")).toBeNull();
    expect(parseColor("hsl(0, 50, 50%)")).toBeNull();
    expect(parseColor("hsl(0, 50%)")).toBeNull();
    expect(parseColor("hsla(0, 0%, 0%, bad)")).toBeNull();
    expect(parseColor("hsl(")).toBeNull();
    expect(parseColor("")).toBeNull();
  });

  test("calculates contrast ratio", () => {
    const white = { r: 1, g: 1, b: 1 };
    const black = { r: 0, g: 0, b: 0 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
  });
});
