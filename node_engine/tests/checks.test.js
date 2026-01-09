const { AbsolutePositioningCheck, isAbsolutePositioningValue, tryGetCanvasPositioning } = require("../src/checks/AbsolutePositioningCheck");
const {
  FixedWidthLayoutCheck,
  isFixedDimensionValue,
  tryGetFixedStyleWidth,
  isFixedMarkupLength,
  describeProperty,
  tryGetFixedStyleHeight,
  parseFixedLengthToPx,
  isFixedLengthAtLeast,
  MIN_VIEWPORT_WIDTH_PX,
  MIN_VIEWPORT_HEIGHT_PX
} = require("../src/checks/FixedWidthLayoutCheck");
const { MissingLabelCheck } = require("../src/checks/MissingLabelCheck");
const { MissingDocumentLanguageCheck } = require("../src/checks/MissingDocumentLanguageCheck");
const { UnlabeledButtonCheck, hasButtonLabel, hasInputButtonLabel } = require("../src/checks/UnlabeledButtonCheck");
const { MissingPageTitleCheck } = require("../src/checks/MissingPageTitleCheck");
const { MissingTableHeaderCheck } = require("../src/checks/MissingTableHeaderCheck");
const { MissingAltTextCheck } = require("../src/checks/MissingAltTextCheck");
const { MissingLinkTextCheck, hasImageAltText } = require("../src/checks/MissingLinkTextCheck");
const { EmptyFormLabelCheck } = require("../src/checks/EmptyFormLabelCheck");
const { OrphanedFormLabelCheck } = require("../src/checks/OrphanedFormLabelCheck");
const { EmptyLinkCheck, isLink } = require("../src/checks/EmptyLinkCheck");
const { EmptyHeadingCheck, hasImageAltText: hasHeadingImageAltText } = require("../src/checks/EmptyHeadingCheck");
const { MissingHeadingStructureCheck } = require("../src/checks/MissingHeadingStructureCheck");
const { DeviceDependentEventHandlerCheck, containsAny } = require("../src/checks/DeviceDependentEventHandlerCheck");
const { RedundantTitleTextCheck, normalize, textMatches } = require("../src/checks/RedundantTitleTextCheck");
const { LayoutTableCheck } = require("../src/checks/LayoutTableCheck");
const { MissingIframeTitleCheck } = require("../src/checks/MissingIframeTitleCheck");
const { MissingFieldsetLegendCheck } = require("../src/checks/MissingFieldsetLegendCheck");
const {
  MissingSkipLinkCheck,
  normalizeText,
  isSkipLabel,
  isFocusable
} = require("../src/checks/MissingSkipLinkCheck");
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
  extractCssColorToken,
  extractColorTokens,
  parseCssBackgroundColors,
  parseCssValue,
  parseXmlAttribute,
  resolveStaticColor,
  extractCssVarFallback,
  extractXamlFallback,
  normalizeColorValue,
  parseFontSize,
  parseCssFontSize,
  parseFontWeight,
  getRequiredContrastRatio,
  getCandidates,
  blendColors
} = require("../src/checks/InsufficientContrastCheck");
const { parseColor } = require("../src/checks/ColorContrastAnalyzer");
const { XamlMissingNameCheck } = require("../src/checks/XamlMissingNameCheck");
const { getAttributeValue } = require("../src/checks/AttributeParser");

const createContext = (content, kind = "html") => ({
  filePath: "file",
  content,
  kind
});

const rule = { id: "rule-1" };

describe("AttributeParser", () => {
  test("parses double, single, and unquoted attribute values", () => {
    const attrs = 'title="Video" aria-label=\'Label\' data-id=${id} width=400';
    expect(getAttributeValue(attrs, "title")).toBe("Video");
    expect(getAttributeValue(attrs, "aria-label")).toBe("Label");
    expect(getAttributeValue(attrs, "data-id")).toBe("${id}");
    expect(getAttributeValue(attrs, "width")).toBe("400");
  });

  test("returns null when attribute is missing or has no value", () => {
    const attrs = "disabled title";
    expect(getAttributeValue(attrs, "disabled")).toBeNull();
    expect(getAttributeValue(attrs, "title")).toBeNull();
    expect(getAttributeValue(attrs, "missing")).toBeNull();
  });
});

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
  test("detects fixed dimensions that exceed reflow thresholds", () => {
    expect(isFixedDimensionValue("400", MIN_VIEWPORT_WIDTH_PX)).toBe(true);
    expect(isFixedDimensionValue("300", MIN_VIEWPORT_WIDTH_PX)).toBe(false);
    expect(isFixedDimensionValue("Auto", MIN_VIEWPORT_WIDTH_PX)).toBe(false);
    expect(isFixedDimensionValue("1*", MIN_VIEWPORT_WIDTH_PX)).toBe(false);

    const htmlContext = createContext(
      '<div style="width:400px"></div><div height="300"></div><div width="200"></div>',
      "html"
    );
    expect(FixedWidthLayoutCheck.run(htmlContext, rule)).toHaveLength(2);

    const xamlContext = createContext(
      '<Grid Width="400" /><Grid MinWidth="500" /><Grid Height="300" /><Grid MinHeight="200" />',
      "xaml"
    );
    expect(FixedWidthLayoutCheck.run(xamlContext, rule)).toHaveLength(3);

    expect(tryGetFixedStyleWidth("width:400px; min-width:200px").propertyName).toBe("width");
    expect(tryGetFixedStyleHeight("height:100px; min-height:300px").propertyName).toBe("min-height");
    expect(isFixedMarkupLength("100%", { minPx: MIN_VIEWPORT_WIDTH_PX })).toBe(false);
    expect(isFixedMarkupLength("10px", { minPx: MIN_VIEWPORT_WIDTH_PX })).toBe(false);
    expect(isFixedMarkupLength("500", { minPx: MIN_VIEWPORT_WIDTH_PX })).toBe(true);
    expect(describeProperty("min-width")).toBe("minimum width");
    expect(describeProperty("min-height")).toBe("minimum height");
  });

  test("parses fixed lengths and thresholds", () => {
    expect(parseFixedLengthToPx("20px")).toBe(20);
    expect(parseFixedLengthToPx("1in")).toBeCloseTo(96, 4);
    expect(parseFixedLengthToPx("2em")).toBe(32);
    expect(parseFixedLengthToPx("10%", { assumePixels: true })).toBeNull();
    expect(parseFixedLengthToPx("12", { assumePixels: false })).toBeNull();
    expect(isFixedLengthAtLeast("320px", MIN_VIEWPORT_WIDTH_PX)).toBe(false);
    expect(isFixedLengthAtLeast("321px", MIN_VIEWPORT_WIDTH_PX)).toBe(true);
  });

  test("skips non-fixed or under-threshold values", () => {
    const xamlContext = createContext('<Grid MinWidth="Auto" /><Grid Height="200" />', "xaml");
    expect(FixedWidthLayoutCheck.run(xamlContext, rule)).toHaveLength(0);

    const htmlContext = createContext('<div style="width:10px;height:200px"></div>', "html");
    expect(FixedWidthLayoutCheck.run(htmlContext, rule)).toHaveLength(0);

    const nullStyle = tryGetFixedStyleWidth("");
    expect(nullStyle).toBeNull();
    expect(isFixedMarkupLength(null, { minPx: MIN_VIEWPORT_HEIGHT_PX })).toBe(false);
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

    const ariaLabel = createContext('<input aria-label="Name" />', "html");
    expect(MissingLabelCheck.run(ariaLabel, rule)).toHaveLength(0);

    const invalidLabelledBy = createContext('<input aria-labelledby="missing" />', "html");
    expect(MissingLabelCheck.run(invalidLabelledBy, rule)).toHaveLength(1);

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

describe("MissingSkipLinkCheck", () => {
  test("detects missing skip link and ordering issues", () => {
    const missing = createContext("<body><main></main></body>", "html");
    expect(MissingSkipLinkCheck.run(missing, rule)).toHaveLength(1);

    const wrongHref = createContext("<a href=\"/home\">Skip to main</a><main id=\"main\"></main>", "html");
    expect(MissingSkipLinkCheck.run(wrongHref, rule)).toHaveLength(1);

    const skipFirst = createContext(
      '<a href="#main">Skip to main content</a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(skipFirst, rule)).toHaveLength(0);

    const skipSecond = createContext(
      '<button>Menu</button><a href="#main">Skip to main content</a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(skipSecond, rule)).toHaveLength(1);
  });

  test("supports aria labels, title text, and focusability checks", () => {
    expect(normalizeText(" Skip <span>to</span>  content ")).toBe("skip to content");
    expect(isSkipLabel("Skip to main")).toBe(true);
    expect(isSkipLabel("Jump to main")).toBe(false);
    expect(isFocusable("a", 'href="#main"')).toBe(true);
    expect(isFocusable("a", 'tabindex="0"')).toBe(true);
    expect(isFocusable("a", 'tabindex="-1"')).toBe(false);
    expect(isFocusable("a", "")).toBe(false);
    expect(isFocusable("input", 'type="hidden"')).toBe(false);
    expect(isFocusable("input", "")).toBe(true);
    expect(isFocusable("button", 'disabled')).toBe(false);

    const ariaLabel = createContext(
      '<a href="#main" aria-label="Skip to content"></a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(ariaLabel, rule)).toHaveLength(0);

    const titleLabel = createContext(
      '<a href="#main" title="Skip to content"></a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(titleLabel, rule)).toHaveLength(0);
  });
});

describe("EmptyFormLabelCheck", () => {
  test("detects labels without readable content", () => {
    const emptyLabel = createContext('<label for="name"></label><input id="name" />', "html");
    expect(EmptyFormLabelCheck.run(emptyLabel, rule)).toHaveLength(1);

    const textLabel = createContext('<label for="name">Name</label><input id="name" />', "html");
    expect(EmptyFormLabelCheck.run(textLabel, rule)).toHaveLength(0);

    const ariaLabel = createContext('<label aria-label="Name" for="name"></label><input id="name" />', "html");
    expect(EmptyFormLabelCheck.run(ariaLabel, rule)).toHaveLength(0);

    const labelledBy = createContext(
      '<span id="label">Name</span><label aria-labelledby="label" for="name"></label><input id="name" />',
      "html"
    );
    expect(EmptyFormLabelCheck.run(labelledBy, rule)).toHaveLength(0);

    const titled = createContext('<label title="Name" for="name"></label><input id="name" />', "html");
    expect(EmptyFormLabelCheck.run(titled, rule)).toHaveLength(0);
  });
});

describe("OrphanedFormLabelCheck", () => {
  test("detects labels that reference missing controls", () => {
    const missing = createContext('<label for="missing">Name</label>', "html");
    expect(OrphanedFormLabelCheck.run(missing, rule)).toHaveLength(1);

    const matching = createContext('<label for="name">Name</label><input id="name" />', "html");
    expect(OrphanedFormLabelCheck.run(matching, rule)).toHaveLength(0);

    const blank = createContext('<label for=" "></label>', "html");
    expect(OrphanedFormLabelCheck.run(blank, rule)).toHaveLength(0);
  });
});

describe("EmptyLinkCheck", () => {
  test("detects links with no accessible name", () => {
    const emptyLink = createContext('<a href="/home"></a>', "html");
    expect(EmptyLinkCheck.run(emptyLink, rule)).toHaveLength(1);

    const textLink = createContext('<a href="/home">Home</a>', "html");
    expect(EmptyLinkCheck.run(textLink, rule)).toHaveLength(0);

    const labelled = createContext('<a href="/home" aria-label="Home"></a>', "html");
    expect(EmptyLinkCheck.run(labelled, rule)).toHaveLength(0);

    const labelledBy = createContext('<span id="home">Home</span><a href="/home" aria-labelledby="home"></a>', "html");
    expect(EmptyLinkCheck.run(labelledBy, rule)).toHaveLength(0);

    const titled = createContext('<a href="/home" title="Home"></a>', "html");
    expect(EmptyLinkCheck.run(titled, rule)).toHaveLength(0);

    const notLink = createContext("<a></a>", "html");
    expect(EmptyLinkCheck.run(notLink, rule)).toHaveLength(0);
  });

  test("helper identifies link attributes", () => {
    expect(isLink('href="/home"')).toBe(true);
    expect(isLink('role="link"')).toBe(true);
    expect(isLink("")).toBe(false);
  });
});

describe("EmptyHeadingCheck", () => {
  test("detects empty headings", () => {
    const empty = createContext("<h1></h1>", "html");
    expect(EmptyHeadingCheck.run(empty, rule)).toHaveLength(1);

    const whitespace = createContext("<h2>   </h2>", "html");
    expect(EmptyHeadingCheck.run(whitespace, rule)).toHaveLength(1);
  });

  test("skips headings with text or image alt text", () => {
    const text = createContext("<h3>Title</h3>", "html");
    expect(EmptyHeadingCheck.run(text, rule)).toHaveLength(0);

    const withImageAlt = createContext('<h4><img src="logo.png" alt="Logo"></h4>', "html");
    expect(EmptyHeadingCheck.run(withImageAlt, rule)).toHaveLength(0);

    const withImageNoAlt = createContext('<h5><img src="logo.png"></h5>', "html");
    expect(EmptyHeadingCheck.run(withImageNoAlt, rule)).toHaveLength(1);
  });

  test("helper detects image alt text", () => {
    expect(hasHeadingImageAltText('<img alt="Logo" />')).toBe(true);
    expect(hasHeadingImageAltText('<img alt=" " />')).toBe(false);
    expect(hasHeadingImageAltText("")).toBe(false);
  });
});

describe("MissingHeadingStructureCheck", () => {
  test("detects missing headings", () => {
    const missing = createContext("<main></main>", "html");
    expect(MissingHeadingStructureCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext("<main><h2>Title</h2></main>", "html");
    expect(MissingHeadingStructureCheck.run(present, rule)).toHaveLength(0);
  });
});

describe("DeviceDependentEventHandlerCheck", () => {
  test("detects mouse handlers without keyboard equivalents", () => {
    const clickOnly = createContext('<div onclick="go()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(clickOnly, rule)).toHaveLength(1);

    const clickWithKey = createContext('<div onclick="go()" onkeydown="go()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(clickWithKey, rule)).toHaveLength(0);

    const pointerOnly = createContext('<div onpointerdown="go()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(pointerOnly, rule)).toHaveLength(1);

    const pointerWithKey = createContext('<div onpointerdown="go()" onkeyup="go()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(pointerWithKey, rule)).toHaveLength(0);

    const touchOnly = createContext('<div ontouchstart="go()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(touchOnly, rule)).toHaveLength(1);

    const hoverOnly = createContext('<div onmouseover="show()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(hoverOnly, rule)).toHaveLength(1);

    const hoverWithFocus = createContext('<div onmouseover="show()" onfocus="show()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(hoverWithFocus, rule)).toHaveLength(0);

    const pointerHoverOnly = createContext('<div onpointerover="show()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(pointerHoverOnly, rule)).toHaveLength(1);

    const pointerHoverWithFocus = createContext('<div onpointerover="show()" onfocusin="show()"></div>', "html");
    expect(DeviceDependentEventHandlerCheck.run(pointerHoverWithFocus, rule)).toHaveLength(0);

    const noHandlers = createContext("<div></div>", "html");
    expect(DeviceDependentEventHandlerCheck.run(noHandlers, rule)).toHaveLength(0);
  });

  test("helper detects configured attributes", () => {
    expect(containsAny('onclick="go()"', ["onclick"])).toBe(true);
    expect(containsAny("", ["onclick"])).toBe(false);
  });
});

describe("RedundantTitleTextCheck", () => {
  test("detects duplicate title text", () => {
    const duplicateAria = createContext('<span title="Info" aria-label="Info"></span>', "html");
    expect(RedundantTitleTextCheck.run(duplicateAria, rule)).toHaveLength(1);

    const duplicateText = createContext('<button title="Save">Save</button>', "html");
    expect(RedundantTitleTextCheck.run(duplicateText, rule)).toHaveLength(1);

    const distinct = createContext('<button title="Save changes">Save</button>', "html");
    expect(RedundantTitleTextCheck.run(distinct, rule)).toHaveLength(0);

    const emptyTitle = createContext('<span title=" "></span>', "html");
    expect(RedundantTitleTextCheck.run(emptyTitle, rule)).toHaveLength(0);
  });

  test("helper normalization and matching", () => {
    expect(normalize("  Hello   World ")).toBe("Hello World");
    expect(textMatches("Hello", "")).toBe(false);
    expect(textMatches("Hello", "Hello")).toBe(true);
    expect(textMatches("Hello", "hello")).toBe(true);
  });
});

describe("LayoutTableCheck", () => {
  test("detects layout tables without headers or caption", () => {
    const layout = createContext("<table><tr><td>Cell</td></tr></table>", "html");
    expect(LayoutTableCheck.run(layout, rule)).toHaveLength(1);

    const withHeaders = createContext("<table><tr><th>Header</th></tr></table>", "html");
    expect(LayoutTableCheck.run(withHeaders, rule)).toHaveLength(0);

    const withCaption = createContext("<table><caption>Data</caption><tr><td>Cell</td></tr></table>", "html");
    expect(LayoutTableCheck.run(withCaption, rule)).toHaveLength(0);

    const presentation = createContext('<table role="presentation"><tr><td>Cell</td></tr></table>', "html");
    expect(LayoutTableCheck.run(presentation, rule)).toHaveLength(0);

    const noneRole = createContext('<table role="none"><tr><td>Cell</td></tr></table>', "html");
    expect(LayoutTableCheck.run(noneRole, rule)).toHaveLength(0);
  });
});

describe("MissingTableHeaderCheck", () => {
  test("detects tables missing headers", () => {
    const missing = createContext("<table><tr><td>Cell</td></tr></table>", "html");
    expect(MissingTableHeaderCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext("<table><tr><th>Header</th></tr></table>", "html");
    expect(MissingTableHeaderCheck.run(present, rule)).toHaveLength(0);

    const roleGrid = createContext('<table role="grid"><tr><td>Cell</td></tr></table>', "html");
    expect(MissingTableHeaderCheck.run(roleGrid, rule)).toHaveLength(1);

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

describe("MissingLinkTextCheck", () => {
  test("detects links missing accessible text", () => {
    const missing = createContext('<a href="/"></a>', "html");
    expect(MissingLinkTextCheck.run(missing, rule)).toHaveLength(1);

    const withText = createContext('<a href="/">Home</a>', "html");
    expect(MissingLinkTextCheck.run(withText, rule)).toHaveLength(0);

    const withAriaLabel = createContext('<a href="/" aria-label="Home"></a>', "html");
    expect(MissingLinkTextCheck.run(withAriaLabel, rule)).toHaveLength(0);

    const withLabelledBy = createContext('<span id="label">Home</span><a href="/" aria-labelledby="label"></a>', "html");
    expect(MissingLinkTextCheck.run(withLabelledBy, rule)).toHaveLength(0);

    const withTitle = createContext('<a href="/" title="Home"></a>', "html");
    expect(MissingLinkTextCheck.run(withTitle, rule)).toHaveLength(0);

    const withImageAlt = createContext('<a href="/"><img alt="Home" src="x" /></a>', "html");
    expect(MissingLinkTextCheck.run(withImageAlt, rule)).toHaveLength(0);

    const missingImageAlt = createContext('<a href="/"><img src="x" /></a>', "html");
    expect(MissingLinkTextCheck.run(missingImageAlt, rule)).toHaveLength(1);

    expect(hasImageAltText('<img alt="" />')).toBe(false);
    expect(hasImageAltText('<img alt="  " />')).toBe(false);
    expect(hasImageAltText('<img alt="Home" />')).toBe(true);
  });
});

describe("MissingIframeTitleCheck", () => {
  test("detects iframes missing title", () => {
    const missing = createContext('<iframe src="video"></iframe>', "html");
    expect(MissingIframeTitleCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<iframe title="Video" src="video"></iframe>', "html");
    expect(MissingIframeTitleCheck.run(present, rule)).toHaveLength(0);
  });

  test("supports quoted and templated iframe titles", () => {
    const singleQuote = createContext("<iframe title='Video' src=\"video\"></iframe>", "html");
    expect(MissingIframeTitleCheck.run(singleQuote, rule)).toHaveLength(0);

    const unquoted = createContext("<iframe title=${title} src=\"video\"></iframe>", "html");
    expect(MissingIframeTitleCheck.run(unquoted, rule)).toHaveLength(0);

    const empty = createContext("<iframe title=\"\" src=\"video\"></iframe>", "html");
    expect(MissingIframeTitleCheck.run(empty, rule)).toHaveLength(1);
  });

  test("detects freemarker iframe macros", () => {
    const macroMissing = createContext("<@iframe src=\"video\" />", "html");
    expect(MissingIframeTitleCheck.run(macroMissing, rule)).toHaveLength(1);

    const macroPresent = createContext("<@iframe title=\"Video\" src=\"video\" />", "html");
    expect(MissingIframeTitleCheck.run(macroPresent, rule)).toHaveLength(0);

    const namespacedMissing = createContext("<@ui.iframe src=\"video\" />", "html");
    expect(MissingIframeTitleCheck.run(namespacedMissing, rule)).toHaveLength(1);

    const nonIframeMacro = createContext("<@layout.frame src=\"video\" />", "html");
    expect(MissingIframeTitleCheck.run(nonIframeMacro, rule)).toHaveLength(0);
  });
});

describe("MissingFieldsetLegendCheck", () => {
  test("detects fieldsets missing legend text", () => {
    const missing = createContext("<fieldset></fieldset>", "html");
    expect(MissingFieldsetLegendCheck.run(missing, rule)).toHaveLength(1);

    const emptyLegend = createContext("<fieldset><legend></legend></fieldset>", "html");
    expect(MissingFieldsetLegendCheck.run(emptyLegend, rule)).toHaveLength(1);

    const present = createContext("<fieldset><legend>Billing</legend></fieldset>", "html");
    expect(MissingFieldsetLegendCheck.run(present, rule)).toHaveLength(0);
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
    expect(parseCssColor("background: url(x) #abc", ["background", "background-color"])).toBe("#abc");
    expect(extractCssColorToken("url(x) rgba(1, 2, 3, 0.5)")).toBe("rgba(1, 2, 3, 0.5)");
    expect(extractColorTokens("linear-gradient(#fff, rgb(0,0,0))")).toEqual(["#fff", "rgb(0,0,0)"]);
    expect(parseCssValue("background: #fff;", "background")).toBe("#fff");
    expect(parseCssValue("color: #fff;", ["background", "color"])).toBe("#fff");
    expect(parseCssBackgroundColors("background: #fff linear-gradient(#000, #333);"))
      .toEqual(["#fff", "#000", "#333"]);
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
    expect(parseColor("hsl(0, 0%, 0%)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("red")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(blendColors({ r: 1, g: 1, b: 1, a: 0.5 }, { r: 0, g: 0, b: 0, a: 1 }))
      .toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1 });

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

    const rgbContext = createContext('<div style="color: rgb(10, 10, 10); background: rgb(30, 30, 30)"></div>', "html");
    expect(InsufficientContrastCheck.run(rgbContext, rule)).toHaveLength(1);

    const hslContext = createContext('<div style="color: hsl(0, 0%, 10%); background-color: hsl(0, 0%, 30%)"></div>', "html");
    expect(InsufficientContrastCheck.run(hslContext, rule)).toHaveLength(1);

    const xamlAlpha = createContext('<TextBlock Foreground="#80FFFFFF" Background="#80FFFFFF" />', "xaml");
    expect(InsufficientContrastCheck.run(xamlAlpha, rule)).toHaveLength(1);

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

  test("evaluates gradients and background images using extracted colors", () => {
    const gradientContext = createContext(
      '<div style="color:#777;background:linear-gradient(#fff, #000)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(gradientContext, rule)).toHaveLength(1);

    const backgroundImageContext = createContext(
      '<div style="color:#777;background-color:#888;background-image:url(hero.png)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(backgroundImageContext, rule)).toHaveLength(1);

    const backgroundImageNoColor = createContext(
      '<div style="color:#777;background-image:url(hero.png)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(backgroundImageNoColor, rule)).toHaveLength(0);
  });

  test("uses large text thresholds when font size is present", () => {
    expect(parseFontSize("24px")).toBe(24);
    expect(parseCssFontSize("font-size: 18pt")).toBeCloseTo(24, 4);
    expect(parseFontWeight("700")).toBe(true);
    expect(parseFontWeight("normal")).toBe(false);
    expect(getRequiredContrastRatio({ fontSizePx: 24, isBold: false })).toBe(3);
    expect(getRequiredContrastRatio({ fontSizePx: 19, isBold: true })).toBe(3);
    expect(getRequiredContrastRatio({ fontSizePx: 16, isBold: false })).toBe(4.5);

    const normalText = createContext(
      '<div style="color:#888;background-color:#fff;font-size:20px"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(normalText, rule)).toHaveLength(1);

    const largeText = createContext(
      '<div style="color:#888;background-color:#fff;font-size:24px"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(largeText, rule)).toHaveLength(0);
  });

  test("covers parsing fallbacks and invalid values", () => {
    expect(extractCssColorToken("   ")).toBeNull();
    expect(extractColorTokens(null)).toEqual([]);
    expect(extractColorTokens("12345")).toEqual([]);
    expect(extractColorTokens("no-colors-here")).toEqual([]);
    expect(extractXamlFallback("{Binding FallbackValue=#123456")).toBe("#123456");
    expect(resolveStaticColor("{Binding FallbackValue=}")).toBeNull();
    expect(resolveStaticColor("{Binding FallbackValue=#fff")).toBe("{Binding FallbackValue=#fff");
    expect(parseFontSize("big")).toBeNull();
    expect(parseFontSize(".px")).toBeNull();
    expect(parseFontSize("12vh")).toBeNull();
    expect(blendColors({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1, a: 1 }))
      .toEqual({ r: 0, g: 0, b: 0, a: 1 });

    const unresolvedBackground = createContext(
      '<div style="color:#777;background-color:var(--missing)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(unresolvedBackground, rule)).toHaveLength(0);

    const invalidBackground = createContext(
      '<div style="color:#777;background-color:not-a-color"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(invalidBackground, rule)).toHaveLength(0);
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
