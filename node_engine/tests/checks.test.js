const { AbsolutePositioningCheck, isAbsolutePositioningValue, tryGetCanvasPositioning } = require("../src/checks/AbsolutePositioningCheck");
const {
  FixedWidthLayoutCheck,
  isFixedWidthValue,
  tryGetFixedStyleWidth,
  isFixedMarkupLength,
  describeProperty
} = require("../src/checks/FixedWidthLayoutCheck");
const { MissingLabelCheck } = require("../src/checks/MissingLabelCheck");
const { MissingDocumentLanguageCheck } = require("../src/checks/MissingDocumentLanguageCheck");
const { UnlabeledButtonCheck, hasButtonLabel, hasInputButtonLabel } = require("../src/checks/UnlabeledButtonCheck");
const { MissingPageTitleCheck } = require("../src/checks/MissingPageTitleCheck");
const { MissingTableHeaderCheck } = require("../src/checks/MissingTableHeaderCheck");
const { MissingAltTextCheck } = require("../src/checks/MissingAltTextCheck");
const { NonWrappingContainerCheck, isNonWrappingValue } = require("../src/checks/NonWrappingContainerCheck");
const { InvalidAriaRoleCheck } = require("../src/checks/InvalidAriaRoleCheck");
const { HiddenNavigationCheck, hasHiddenStyle } = require("../src/checks/HiddenNavigationCheck");
const {
  HiddenFocusableElementCheck,
  collectReferencedIds,
  isHtmlFocusable,
  isXamlFocusable,
  isHtmlHidden,
  isXamlHidden,
  isSelfClosing,
  isHtmlReferenced,
  isNegativeTabIndex
} = require("../src/checks/HiddenFocusableElementCheck");
const {
  InsufficientContrastCheck,
  parseCssColor,
  parseXmlAttribute,
  resolveStaticColor,
  extractCssVarFallback,
  extractXamlFallback,
  normalizeColorValue,
  getCandidates
} = require("../src/checks/InsufficientContrastCheck");
const { XamlMissingNameCheck } = require("../src/checks/XamlMissingNameCheck");

const createContext = (content, kind = "html") => ({
  filePath: "file",
  content,
  kind
});

const rule = { id: "rule-1" };

describe("AbsolutePositioningCheck", () => {
  test("detects absolute positioning in markup and xaml", () => {
    expect(isAbsolutePositioningValue("absolute")).toBe(true);
    expect(isAbsolutePositioningValue("relative")).toBe(false);

    const htmlContext = createContext('<div style="position:absolute"></div>', "html");
    expect(AbsolutePositioningCheck.run(htmlContext, rule)).toHaveLength(1);

    const xamlContext = createContext('<Grid Canvas.Left="10" />', "xaml");
    expect(tryGetCanvasPositioning('Canvas.Left="10"')).toEqual({
      attributeName: "Canvas.Left",
      attributeValue: "10"
    });
    expect(AbsolutePositioningCheck.run(xamlContext, rule)).toHaveLength(1);

    const xamlNoCanvas = createContext("<Grid />", "xaml");
    expect(AbsolutePositioningCheck.run(xamlNoCanvas, rule)).toHaveLength(0);
  });
});

describe("FixedWidthLayoutCheck", () => {
  test("detects fixed widths", () => {
    expect(isFixedWidthValue("10")).toBe(true);
    expect(isFixedWidthValue("Auto")).toBe(false);
    expect(isFixedWidthValue("1*")).toBe(false);

    const htmlContext = createContext('<div style="width:10px"></div><div width="200"></div>', "html");
    expect(FixedWidthLayoutCheck.run(htmlContext, rule)).toHaveLength(2);

    const xamlContext = createContext('<Grid Width="200" /><Grid MinWidth="50" />', "xaml");
    expect(FixedWidthLayoutCheck.run(xamlContext, rule)).toHaveLength(2);

    expect(tryGetFixedStyleWidth("width:10px; min-width:20px").propertyName).toBe("width");
    expect(isFixedMarkupLength("100%")).toBe(false);
    expect(isFixedMarkupLength("10px")).toBe(true);
    expect(describeProperty("min-width")).toBe("minimum width");
  });

  test("skips non-fixed xaml min width", () => {
    const xamlContext = createContext('<Grid MinWidth="Auto" />', "xaml");
    expect(FixedWidthLayoutCheck.run(xamlContext, rule)).toHaveLength(0);
  });
});

describe("MissingLabelCheck", () => {
  test("detects missing labels on form controls", () => {
    const htmlContext = createContext('<input type="text" />', "html");
    expect(MissingLabelCheck.run(htmlContext, rule)).toHaveLength(1);

    const withLabel = createContext('<label for="name">Name</label><input id="name" />', "html");
    expect(MissingLabelCheck.run(withLabel, rule)).toHaveLength(0);

    const hiddenInput = createContext('<input type="hidden" />', "html");
    expect(MissingLabelCheck.run(hiddenInput, rule)).toHaveLength(0);

    const labelledBy = createContext(
      '<div id="label"></div><input aria-labelledby="label" />',
      "html"
    );
    expect(MissingLabelCheck.run(labelledBy, rule)).toHaveLength(0);

    const wrappedLabel = createContext('<label><input /></label>', "html");
    expect(MissingLabelCheck.run(wrappedLabel, rule)).toHaveLength(0);
  });
});

describe("MissingDocumentLanguageCheck", () => {
  test("detects missing language", () => {
    const missing = createContext('<html><body></body></html>', "html");
    expect(MissingDocumentLanguageCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<html lang="en"><body></body></html>', "html");
    expect(MissingDocumentLanguageCheck.run(present, rule)).toHaveLength(0);

    const presentXml = createContext('<html xml:lang="en"><body></body></html>', "html");
    expect(MissingDocumentLanguageCheck.run(presentXml, rule)).toHaveLength(0);

    const noTag = createContext('<body></body>', "html");
    expect(MissingDocumentLanguageCheck.run(noTag, rule)).toHaveLength(0);
  });
});

describe("UnlabeledButtonCheck", () => {
  test("detects unlabeled buttons", () => {
    const context = createContext('<button></button><input type="submit" />', "html");
    expect(UnlabeledButtonCheck.run(context, rule)).toHaveLength(2);

    const labeled = createContext(
      '<button aria-label="Save"></button><input type="submit" value="Go" />',
      "html"
    );
    expect(UnlabeledButtonCheck.run(labeled, rule)).toHaveLength(0);

    const labelInfo = {
      elementIds: new Set(["label-id"]),
      labelForIds: new Set(["label-id"]),
      labelRanges: [{ start: 0, end: 10 }]
    };
    expect(hasButtonLabel('aria-label="x"', "", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)).toBe(true);
    expect(
      hasButtonLabel('aria-labelledby="label-id"', "", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(hasButtonLabel('id="label-id"', "", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)).toBe(
      true
    );
    expect(hasButtonLabel("", "", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)).toBe(true);
    expect(
      hasInputButtonLabel('type="image" alt="test"', "image", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(
      hasInputButtonLabel('value="Go"', "submit", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(
      hasInputButtonLabel('aria-label="Ok"', "submit", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(
      hasInputButtonLabel('aria-labelledby="label-id"', "submit", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(
      hasInputButtonLabel('title="Ok"', "submit", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(
      hasInputButtonLabel('id="label-id"', "submit", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)
    ).toBe(true);
    expect(hasButtonLabel('title="Save"', "", labelInfo.elementIds, labelInfo.labelForIds, 5, labelInfo.labelRanges)).toBe(
      true
    );

    const inputIgnored = createContext('<input type="text" />', "html");
    expect(UnlabeledButtonCheck.run(inputIgnored, rule)).toHaveLength(0);
  });
});

describe("MissingPageTitleCheck", () => {
  test("detects missing or empty titles", () => {
    const missing = createContext("<html></html>", "html");
    expect(MissingPageTitleCheck.run(missing, rule)).toHaveLength(1);

    const empty = createContext("<title></title>", "html");
    expect(MissingPageTitleCheck.run(empty, rule)).toHaveLength(1);

    const ok = createContext("<title>Home</title>", "html");
    expect(MissingPageTitleCheck.run(ok, rule)).toHaveLength(0);

    const multi = createContext("<title></title><title>Home</title>", "html");
    expect(MissingPageTitleCheck.run(multi, rule)).toHaveLength(0);
  });
});

describe("MissingTableHeaderCheck", () => {
  test("detects tables missing headers", () => {
    const missing = createContext("<table><tr><td>Cell</td></tr></table>", "html");
    expect(MissingTableHeaderCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext("<table><tr><th>Header</th></tr></table>", "html");
    expect(MissingTableHeaderCheck.run(present, rule)).toHaveLength(0);

    const presentation = createContext('<table role="presentation"></table>', "html");
    expect(MissingTableHeaderCheck.run(presentation, rule)).toHaveLength(0);

    const noneRole = createContext('<table role="none"></table>', "html");
    expect(MissingTableHeaderCheck.run(noneRole, rule)).toHaveLength(0);
  });
});

describe("MissingAltTextCheck", () => {
  test("detects images missing alt text", () => {
    const missing = createContext('<img src="x" />', "html");
    expect(MissingAltTextCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<img alt="desc" src="x" />', "html");
    expect(MissingAltTextCheck.run(present, rule)).toHaveLength(0);
  });
});

describe("NonWrappingContainerCheck", () => {
  test("detects non-wrapping containers", () => {
    expect(isNonWrappingValue("nowrap")).toBe(true);
    expect(isNonWrappingValue("wrap")).toBe(false);

    const htmlContext = createContext('<div style="white-space: nowrap"></div>', "html");
    expect(NonWrappingContainerCheck.run(htmlContext, rule)).toHaveLength(1);

    const xamlContext = createContext('<TextBlock TextWrapping="NoWrap" />', "xaml");
    expect(NonWrappingContainerCheck.run(xamlContext, rule)).toHaveLength(1);

    const xamlOk = createContext('<TextBlock TextWrapping="Wrap" />', "xaml");
    expect(NonWrappingContainerCheck.run(xamlOk, rule)).toHaveLength(0);

    const htmlOk = createContext('<div style="white-space: normal"></div>', "html");
    expect(NonWrappingContainerCheck.run(htmlOk, rule)).toHaveLength(0);
  });
});

describe("InvalidAriaRoleCheck", () => {
  test("detects invalid roles", () => {
    const invalid = createContext('<div role="bad"></div>', "html");
    expect(InvalidAriaRoleCheck.run(invalid, rule)).toHaveLength(1);

    const valid = createContext('<div role="banner"></div>', "html");
    expect(InvalidAriaRoleCheck.run(valid, rule)).toHaveLength(0);

    const noRole = createContext("<div></div>", "html");
    expect(InvalidAriaRoleCheck.run(noRole, rule)).toHaveLength(0);
  });
});

describe("HiddenNavigationCheck", () => {
  test("detects hidden navigation", () => {
    expect(hasHiddenStyle("display: none")).toBe(true);
    expect(hasHiddenStyle("")) .toBe(false);

    const hidden = createContext('<nav aria-hidden="true"></nav><nav style="display:none"></nav><nav hidden></nav>', "html");
    expect(HiddenNavigationCheck.run(hidden, rule)).toHaveLength(3);

    const visible = createContext("<nav></nav>", "html");
    expect(HiddenNavigationCheck.run(visible, rule)).toHaveLength(0);
  });
});

describe("HiddenFocusableElementCheck", () => {
  test("detects hidden focusable elements", () => {
    expect(isNegativeTabIndex("-1")).toBe(true);
    expect(isNegativeTabIndex("x")).toBe(false);

    const html = createContext(
      '<div hidden><button>Click</button></div><a href="#target"></a><div id="target" hidden></div>',
      "html"
    );
    expect(HiddenFocusableElementCheck.run(html, rule)).toHaveLength(2);

    const xaml = createContext('<Button Visibility="Collapsed" IsTabStop="true" />', "xaml");
    expect(HiddenFocusableElementCheck.run(xaml, rule)).toHaveLength(1);

    const refs = collectReferencedIds('<a href="#foo"></a><div aria-controls="bar baz"></div>');
    expect(refs).toEqual(new Set(["foo", "bar", "baz"]));

    expect(isHtmlFocusable("a", 'href="#"')).toBe(true);
    expect(isHtmlFocusable("input", 'type="hidden"')).toBe(false);
    expect(isHtmlFocusable("button", "")).toBe(true);
    expect(isXamlFocusable('IsTabStop="false"')).toBe(false);
    expect(isXamlFocusable('IsTabStop="true"')).toBe(true);
    expect(isHtmlHidden('aria-hidden="true"')).toBe(true);
    expect(isHtmlHidden('style="display:none"')).toBe(true);
    expect(isXamlHidden('Visibility="Hidden"')).toBe(true);
    expect(isHtmlReferenced('id="foo"', new Set(["foo"]))).toBe(true);
    expect(isSelfClosing({ groups: { self: "/" } }, "div", { kind: "html" })).toBe(true);
    expect(isHtmlFocusable("button", "disabled")).toBe(false);
    expect(isHtmlFocusable("div", 'tabindex="-1"')).toBe(false);
    expect(isXamlFocusable('TabIndex="-1"')).toBe(false);
  });
});

describe("InsufficientContrastCheck", () => {
  test("detects low contrast in HTML, CSS, and XAML", () => {
    expect(parseCssColor("color: #111", "color")).toBe("#111");
    expect(parseCssColor("color", "color")).toBeNull();
    expect(parseXmlAttribute('Foreground=" #fff "', "Foreground")).toBe("#fff");
    expect(parseXmlAttribute("", "Foreground")).toBeNull();
    expect(normalizeColorValue("#fff !important")).toBe("#fff");
    expect(extractCssVarFallback("var(--primary, #fff)")).toBe("#fff");
    expect(extractCssVarFallback("var(--primary)")).toBeNull();
    expect(extractCssVarFallback("color")).toBeNull();
    expect(extractXamlFallback("{Binding FallbackValue=#000}")) .toBe("#000");
    expect(extractXamlFallback("{Binding Value=#000}")).toBeNull();
    expect(resolveStaticColor("var(--primary, #fff)")).toBe("#fff");
    expect(resolveStaticColor("{Binding FallbackValue=#fff}")).toBe("#fff");
    expect(resolveStaticColor("")) .toBeNull();

    const htmlContext = createContext('<div style="color:#777; background-color:#888"></div>', "html");
    expect(InsufficientContrastCheck.run(htmlContext, rule)).toHaveLength(1);

    const htmlMissing = createContext('<div style="color:#777"></div>', "html");
    expect(InsufficientContrastCheck.run(htmlMissing, rule)).toHaveLength(0);

    const cssContext = createContext('.a { color: #777; background-color: #888; }', "css");
    expect(InsufficientContrastCheck.run(cssContext, rule)).toHaveLength(1);

    const xamlContext = createContext('<TextBlock Foreground="#777" Background="#888" />', "xaml");
    expect(InsufficientContrastCheck.run(xamlContext, rule)).toHaveLength(1);

    const xamlMissing = createContext('<TextBlock Foreground="#777" />', "xaml");
    expect(InsufficientContrastCheck.run(xamlMissing, rule)).toHaveLength(0);

    expect(getCandidates(htmlContext)).toHaveLength(1);
  });

  test("skips candidates with missing colors or sufficient contrast", () => {
    const cssContext = createContext(".a { color: #fff; }", "css");
    expect(InsufficientContrastCheck.run(cssContext, rule)).toHaveLength(0);

    const highContrast = createContext('<div style="color:#000;background-color:#fff"></div>', "html");
    expect(InsufficientContrastCheck.run(highContrast, rule)).toHaveLength(0);

    const invalidColors = createContext('<div style="color:ggg;background-color:#fff"></div>', "html");
    expect(InsufficientContrastCheck.run(invalidColors, rule)).toHaveLength(0);
  });
});

describe("XamlMissingNameCheck", () => {
  test("detects missing automation properties", () => {
    const missing = createContext('<Button />', "xaml");
    expect(XamlMissingNameCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<Button AutomationProperties.Name="Save" />', "xaml");
    expect(XamlMissingNameCheck.run(present, rule)).toHaveLength(0);
  });
});
