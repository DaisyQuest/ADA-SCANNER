const {
  collectLabelForIds,
  collectLabelRanges,
  collectElementIds,
  collectElementIdsFromDocument,
  collectLabelForIdsFromDocument,
  isWithinLabel,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasLabelForId,
  hasTextContent
} = require("../src/checks/AccessibleNameUtilities");
const { JSDOM } = require("jsdom");

describe("AccessibleNameUtilities", () => {
  test("collects label and element ids from markup", () => {
    const content = '<label for="Name"></label><input id="Name" /><input id="other" />';
    const labelIds = collectLabelForIds(content);
    const elementIds = collectElementIds(content);
    expect(labelIds.has("name")).toBe(true);
    expect(elementIds.has("name")).toBe(true);
    expect(elementIds.has("other")).toBe(true);
  });

  test("collects label ranges and checks index containment", () => {
    const content = '<label>Label</label><input />';
    const ranges = collectLabelRanges(content);
    expect(isWithinLabel(5, ranges)).toBe(true);
    expect(isWithinLabel(100, ranges)).toBe(false);
  });

  test("validates aria and title helpers", () => {
    expect(hasAriaLabel(" ")).toBe(false);
    expect(hasAriaLabel("Label")).toBe(true);
    expect(hasTitle("Title")).toBe(true);
    expect(hasTitle("")).toBe(false);
    expect(hasLabelForId("id", new Set(["id"]))).toBe(true);
    expect(hasLabelForId(null, new Set(["id"]))).toBe(false);
  });

  test("validates aria-labelledby references", () => {
    const ids = new Set(["label", "other"]);
    expect(hasValidAriaLabelledBy("", ids)).toBe(false);
    expect(hasValidAriaLabelledBy("label missing", ids)).toBe(true);
  });

  test("detects text content", () => {
    expect(hasTextContent("<span>Text</span>")).toBe(true);
    expect(hasTextContent("<span> </span>")).toBe(false);
  });

  test("collects ids from DOM documents", () => {
    expect(collectElementIdsFromDocument(null).size).toBe(0);
    expect(collectLabelForIdsFromDocument(undefined).size).toBe(0);

    const dom = new JSDOM('<label for="field"></label><input id="field" />');
    const document = dom.window.document;
    const labelIds = collectLabelForIdsFromDocument(document);
    const elementIds = collectElementIdsFromDocument(document);
    expect(labelIds.has("field")).toBe(true);
    expect(elementIds.has("field")).toBe(true);
  });
});
