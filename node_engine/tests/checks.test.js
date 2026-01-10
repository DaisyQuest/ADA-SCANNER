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
const { MissingAutocompleteCheck } = require("../src/checks/MissingAutocompleteCheck");
const { MissingDocumentLanguageCheck } = require("../src/checks/MissingDocumentLanguageCheck");
const {
  UnlabeledButtonCheck,
  hasButtonLabel,
  hasInputButtonLabel,
  hasButtonLabelFromElement,
  hasInputButtonLabelFromElement,
  getMacroButtonLabel
} = require("../src/checks/UnlabeledButtonCheck");
const { MissingPageTitleCheck } = require("../src/checks/MissingPageTitleCheck");
const { MissingTableHeaderCheck } = require("../src/checks/MissingTableHeaderCheck");
const { MissingAltTextCheck } = require("../src/checks/MissingAltTextCheck");
const {
  MissingLinkTextCheck,
  hasImageAltText,
  hasImageAltTextFromElement,
  hasAccessibleLabelFromElement,
  getMacroTextLabel
} = require("../src/checks/MissingLinkTextCheck");
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
  LabelInNameCheck,
  normalizeText: normalizeLabelText,
  getVisibleLabel,
  getAccessibleNameCandidate,
  isInteractiveCandidate
} = require("../src/checks/LabelInNameCheck");
const { MediaAlternativeCheck } = require("../src/checks/MediaAlternativeCheck");
const { SensoryCharacteristicsCheck, extractText } = require("../src/checks/SensoryCharacteristicsCheck");
const { OrientationLockCheck } = require("../src/checks/OrientationLockCheck");
const { AudioControlCheck } = require("../src/checks/AudioControlCheck");
const { TextResizeCheck } = require("../src/checks/TextResizeCheck");
const { ImagesOfTextCheck } = require("../src/checks/ImagesOfTextCheck");
const { TextSpacingCheck } = require("../src/checks/TextSpacingCheck");
const { HoverFocusContentCheck } = require("../src/checks/HoverFocusContentCheck");
const { InteractionLimitsCheck } = require("../src/checks/InteractionLimitsCheck");
const { NavigationStructureCheck, collectNavSequences } = require("../src/checks/NavigationStructureCheck");
const { FocusVisibleCheck } = require("../src/checks/FocusVisibleCheck");
const { LanguageOfPartsCheck } = require("../src/checks/LanguageOfPartsCheck");
const { ErrorHandlingCheck, hasConfirmationControl } = require("../src/checks/ErrorHandlingCheck");
const { DuplicateIdCheck } = require("../src/checks/DuplicateIdCheck");
const {
  MissingSkipLinkCheck,
  normalizeText,
  isSkipLabel,
  isFocusable,
  isFocusableElement,
  getMacroLabelSource
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
  extractCssVariableDefinitions,
  extractCssVarName,
  resolveCssVarFromStyle,
  resolveColorWithContext,
  extractXamlFallback,
  normalizeColorValue,
  parseFontSize,
  parseCssFontSize,
  parseFontWeight,
  getRequiredContrastRatio,
  getCandidates,
  blendColors,
  shouldDefaultBackground
} = require("../src/checks/InsufficientContrastCheck");
const {
  parseHexColor,
  parseRgbValue,
  parseAlphaValue,
  parseRgbColor,
  parseHslColor,
  parseColor
} = require("../src/checks/ColorContrastAnalyzer");
const { XamlMissingNameCheck } = require("../src/checks/XamlMissingNameCheck");
const { getAttributeValue } = require("../src/checks/AttributeParser");
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

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

    const domMissing = {
      filePath: "file",
      content: '<input type="text" />',
      kind: "html",
      document: new JSDOM('<input type="text" />').window.document
    };
    expect(MissingLabelCheck.run(domMissing, rule)).toHaveLength(1);

    const domLabelled = {
      filePath: "file",
      content: '<label for="name">Name</label><input id="name" />',
      kind: "html",
      document: new JSDOM('<label for="name">Name</label><input id="name" />').window.document
    };
    expect(MissingLabelCheck.run(domLabelled, rule)).toHaveLength(0);

    const domWrapped = {
      filePath: "file",
      content: "<label><input /></label>",
      kind: "html",
      document: new JSDOM("<label><input /></label>").window.document
    };
    expect(MissingLabelCheck.run(domWrapped, rule)).toHaveLength(0);

    const domHidden = {
      filePath: "file",
      content: '<input type="hidden" />',
      kind: "html",
      document: new JSDOM('<input type="hidden" />').window.document
    };
    expect(MissingLabelCheck.run(domHidden, rule)).toHaveLength(0);

    const domAriaLabel = {
      filePath: "file",
      content: '<input aria-label="Name" />',
      kind: "html",
      document: new JSDOM('<input aria-label="Name" />').window.document
    };
    expect(MissingLabelCheck.run(domAriaLabel, rule)).toHaveLength(0);

    const domLabelledBy = {
      filePath: "file",
      content: '<span id="label">Name</span><input aria-labelledby="label" />',
      kind: "html",
      document: new JSDOM('<span id="label">Name</span><input aria-labelledby="label" />').window.document
    };
    expect(MissingLabelCheck.run(domLabelledBy, rule)).toHaveLength(0);
  });
});

describe("MissingAutocompleteCheck", () => {
  test("flags personal data fields missing autocomplete hints", () => {
    const missing = createContext('<input type="text" name="email" />', "html");
    expect(MissingAutocompleteCheck.run(missing, rule)).toHaveLength(1);

    const missingPassword = createContext('<input type="password" aria-label="Password" />', "html");
    expect(MissingAutocompleteCheck.run(missingPassword, rule)).toHaveLength(1);
  });

  test("skips fields with autocomplete or unrelated hints and flags autocomplete off", () => {
    const present = createContext('<input type="text" name="email" autocomplete="email" />', "html");
    expect(MissingAutocompleteCheck.run(present, rule)).toHaveLength(0);

    const off = createContext('<input type="text" name="email" autocomplete="off" />', "html");
    expect(MissingAutocompleteCheck.run(off, rule)).toHaveLength(1);

    const unrelated = createContext('<input type="text" name="search" />', "html");
    expect(MissingAutocompleteCheck.run(unrelated, rule)).toHaveLength(0);

    const hidden = createContext('<input type="hidden" name="email" />', "html");
    expect(MissingAutocompleteCheck.run(hidden, rule)).toHaveLength(0);

    const checkbox = createContext('<input type="checkbox" name="email" />', "html");
    expect(MissingAutocompleteCheck.run(checkbox, rule)).toHaveLength(0);
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

    const domMissing = {
      ...missing,
      document: new JSDOM(missing.content).window.document
    };
    expect(MissingDocumentLanguageCheck.run(domMissing, rule)).toHaveLength(1);

    const domPresent = {
      ...present,
      document: new JSDOM(present.content).window.document
    };
    expect(MissingDocumentLanguageCheck.run(domPresent, rule)).toHaveLength(0);
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

    const dom = new JSDOM('<label for="save"></label><button id="save"></button>');
    expect(hasButtonLabelFromElement(dom.window.document.querySelector("button"), new Set(), new Set(["save"]))).toBe(true);

    const domInput = new JSDOM('<input type="submit" aria-label="Save" />');
    expect(
      hasInputButtonLabelFromElement(domInput.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(true);

    expect(getMacroButtonLabel('label="Save"', "")).toBe("Save");
    expect(getMacroButtonLabel("", "Body")).toBe("Body");

    const domLabelledBy = new JSDOM('<span id="label">Save</span><button aria-labelledby="label"></button>');
    expect(
      hasButtonLabelFromElement(domLabelledBy.window.document.querySelector("button"), new Set(["label"]), new Set())
    ).toBe(true);

    const domTitle = new JSDOM('<button title="Save"></button>');
    expect(
      hasButtonLabelFromElement(domTitle.window.document.querySelector("button"), new Set(), new Set())
    ).toBe(true);

    const domWrapped = new JSDOM('<label><button></button></label>');
    expect(
      hasButtonLabelFromElement(domWrapped.window.document.querySelector("button"), new Set(), new Set())
    ).toBe(true);

    const domButtonMissing = new JSDOM("<button></button>");
    expect(
      hasButtonLabelFromElement(domButtonMissing.window.document.querySelector("button"), new Set(), new Set())
    ).toBe(false);

    const domInputValue = new JSDOM('<input type="submit" value="Go" />');
    expect(
      hasInputButtonLabelFromElement(domInputValue.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(true);

    const domInputLabelledBy = new JSDOM('<span id="submit-label">Submit</span><input type="submit" aria-labelledby="submit-label" />');
    expect(
      hasInputButtonLabelFromElement(domInputLabelledBy.window.document.querySelector("input"), new Set(["submit-label"]), new Set())
    ).toBe(true);

    const domInputTitle = new JSDOM('<input type="submit" title="Send" />');
    expect(
      hasInputButtonLabelFromElement(domInputTitle.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(true);

    const domInputLabelFor = new JSDOM('<label for="send"></label><input id="send" type="submit" />');
    expect(
      hasInputButtonLabelFromElement(domInputLabelFor.window.document.querySelector("input"), new Set(["send"]), new Set(["send"]))
    ).toBe(true);

    const domInputWrapped = new JSDOM('<label><input type="submit" /></label>');
    expect(
      hasInputButtonLabelFromElement(domInputWrapped.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(true);

    const domInputMissing = new JSDOM('<input type="submit" />');
    expect(
      hasInputButtonLabelFromElement(domInputMissing.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(false);

    const domImageMissingAlt = new JSDOM('<input type="image" />');
    expect(
      hasInputButtonLabelFromElement(domImageMissingAlt.window.document.querySelector("input"), new Set(), new Set())
    ).toBe(false);

    const inputIgnored = createContext('<input type="text" />', "html");
    expect(UnlabeledButtonCheck.run(inputIgnored, rule)).toHaveLength(0);

    const macroButton = createContext('<@button></@button><@input type="submit" />', "html");
    expect(UnlabeledButtonCheck.run(macroButton, rule)).toHaveLength(2);

    const macroLabeledButton = createContext('<@button label="Save" />', "html");
    expect(UnlabeledButtonCheck.run(macroLabeledButton, rule)).toHaveLength(0);

    const macroInputLabel = createContext('<@input type="submit" value="Go" />', "html");
    expect(UnlabeledButtonCheck.run(macroInputLabel, rule)).toHaveLength(0);

    const macroInputIgnored = createContext('<@input type="text" />', "html");
    expect(UnlabeledButtonCheck.run(macroInputIgnored, rule)).toHaveLength(0);

    const domUnlabeled = {
      filePath: "file",
      content: "<button></button><input type=\"submit\" />",
      kind: "html",
      document: new JSDOM('<button></button><input type="submit" />').window.document
    };
    expect(UnlabeledButtonCheck.run(domUnlabeled, rule)).toHaveLength(2);

    const domLabeled = {
      filePath: "file",
      content: '<button aria-label="Save"></button><input type="image" alt="Save" />',
      kind: "html",
      document: new JSDOM('<button aria-label="Save"></button><input type="image" alt="Save" />').window.document
    };
    expect(UnlabeledButtonCheck.run(domLabeled, rule)).toHaveLength(0);

    const domTextButton = {
      filePath: "file",
      content: "<button>Save</button>",
      kind: "html",
      document: new JSDOM("<button>Save</button>").window.document
    };
    expect(UnlabeledButtonCheck.run(domTextButton, rule)).toHaveLength(0);

    const domTextInput = {
      filePath: "file",
      content: '<input type="text" />',
      kind: "html",
      document: new JSDOM('<input type="text" />').window.document
    };
    expect(UnlabeledButtonCheck.run(domTextInput, rule)).toHaveLength(0);
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

    const domMissing = {
      filePath: "file",
      content: "<html></html>",
      kind: "html",
      document: new JSDOM("<html></html>").window.document
    };
    expect(MissingPageTitleCheck.run(domMissing, rule)).toHaveLength(1);

    const domEmpty = {
      filePath: "file",
      content: "<title></title>",
      kind: "html",
      document: new JSDOM("<title></title>").window.document
    };
    expect(MissingPageTitleCheck.run(domEmpty, rule)).toHaveLength(1);

    const domPresent = {
      filePath: "file",
      content: "<title>Home</title>",
      kind: "html",
      document: new JSDOM("<title>Home</title>").window.document
    };
    expect(MissingPageTitleCheck.run(domPresent, rule)).toHaveLength(0);
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

    const macroSkip = createContext(
      '<@link href="#main" label="Skip to content" /><button>Menu</button>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(macroSkip, rule)).toHaveLength(0);

    const domContext = { ...skipSecond, document: new JSDOM(skipSecond.content).window.document };
    expect(MissingSkipLinkCheck.run(domContext, rule)).toHaveLength(1);

    const domSkip = { ...skipFirst, document: new JSDOM(skipFirst.content).window.document };
    expect(MissingSkipLinkCheck.run(domSkip, rule)).toHaveLength(0);

    const domMissing = { ...missing, document: new JSDOM(missing.content).window.document };
    expect(MissingSkipLinkCheck.run(domMissing, rule)).toHaveLength(1);

    const domNoAnchor = {
      filePath: "file",
      content: "<button>Menu</button>",
      kind: "html",
      document: new JSDOM("<button>Menu</button>").window.document
    };
    expect(MissingSkipLinkCheck.run(domNoAnchor, rule)).toHaveLength(1);

    const domWrongHref = {
      filePath: "file",
      content: '<a href="/home">Skip</a>',
      kind: "html",
      document: new JSDOM('<a href="/home">Skip</a>').window.document
    };
    expect(MissingSkipLinkCheck.run(domWrongHref, rule)).toHaveLength(1);

    const macroNonSkip = createContext('<@link href="#main" label="Jump to main" />', "html");
    expect(MissingSkipLinkCheck.run(macroNonSkip, rule)).toHaveLength(1);

    const domAriaSkip = {
      filePath: "file",
      content: '<a href="#main" aria-label="Skip to content"></a>',
      kind: "html",
      document: new JSDOM('<a href="#main" aria-label="Skip to content"></a>').window.document
    };
    expect(MissingSkipLinkCheck.run(domAriaSkip, rule)).toHaveLength(0);
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
    expect(isFocusableElement(new JSDOM('<input type="hidden" />').window.document.querySelector("input"))).toBe(false);
    expect(isFocusableElement(new JSDOM('<a tabindex="-1"></a>').window.document.querySelector("a"))).toBe(false);
    expect(getMacroLabelSource('label="Skip"', "")).toBe("Skip");
    expect(getMacroLabelSource("", "Body")).toBe("Body");
    expect(getMacroLabelSource("", undefined)).toBe("");
    expect(isFocusableElement(new JSDOM('<a href="#main"></a>').window.document.querySelector("a"))).toBe(true);
    expect(isFocusableElement(new JSDOM('<a tabindex="0"></a>').window.document.querySelector("a"))).toBe(true);
    expect(isFocusableElement(new JSDOM('<button disabled></button>').window.document.querySelector("button"))).toBe(
      false
    );

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

  test("covers additional skip link branches", () => {
    const domEmptyLabel = {
      filePath: "file",
      content: '<a href="#main"></a><main id="main"></main>',
      kind: "html",
      document: new JSDOM('<a href="#main"></a><main id="main"></main>').window.document
    };
    expect(MissingSkipLinkCheck.run(domEmptyLabel, rule)).toHaveLength(1);

    const hiddenFirst = createContext(
      '<input type="hidden" /><a href="#main">Skip to main</a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(hiddenFirst, rule)).toHaveLength(0);

    const multipleSkips = createContext(
      '<a href="#main">Skip to main</a><a href="#content">Skip to content</a><main id="main"></main>',
      "html"
    );
    expect(MissingSkipLinkCheck.run(multipleSkips, rule)).toHaveLength(0);

    const emptyLabelSkip = createContext('<a href="#main"></a><button>Menu</button>', "html");
    expect(MissingSkipLinkCheck.run(emptyLabelSkip, rule)).toHaveLength(1);

    const macroNonLink = createContext('<@button href="#main" label="Skip to main" />', "html");
    expect(MissingSkipLinkCheck.run(macroNonLink, rule)).toHaveLength(1);

    const macroWrongHref = createContext('<@link href="/home" label="Skip to main" />', "html");
    expect(MissingSkipLinkCheck.run(macroWrongHref, rule)).toHaveLength(1);

    const macroAfterAnchor = createContext(
      '<a href="#main">Skip to main</a><@link href="#content" label="Skip to content" />',
      "html"
    );
    expect(MissingSkipLinkCheck.run(macroAfterAnchor, rule)).toHaveLength(0);
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

    const domEmpty = {
      filePath: "file",
      content: '<a href="/home"></a>',
      kind: "html",
      document: new JSDOM('<a href="/home"></a>').window.document
    };
    expect(EmptyLinkCheck.run(domEmpty, rule)).toHaveLength(1);

    const domLabelled = {
      filePath: "file",
      content: '<span id="home">Home</span><a href="/home" aria-labelledby="home"></a>',
      kind: "html",
      document: new JSDOM('<span id="home">Home</span><a href="/home" aria-labelledby="home"></a>').window.document
    };
    expect(EmptyLinkCheck.run(domLabelled, rule)).toHaveLength(0);

    const domRoleLink = {
      filePath: "file",
      content: '<div role="link" aria-label="Home"></div>',
      kind: "html",
      document: new JSDOM('<div role="link" aria-label="Home"></div>').window.document
    };
    expect(EmptyLinkCheck.run(domRoleLink, rule)).toHaveLength(0);

    const domSkipped = {
      filePath: "file",
      content: "<a>Skip</a>",
      kind: "html",
      document: new JSDOM("<a>Skip</a>").window.document
    };
    expect(EmptyLinkCheck.run(domSkipped, rule)).toHaveLength(0);

    const domWithText = {
      filePath: "file",
      content: '<a href="/home">Home</a>',
      kind: "html",
      document: new JSDOM('<a href="/home">Home</a>').window.document
    };
    expect(EmptyLinkCheck.run(domWithText, rule)).toHaveLength(0);

    const domTitle = {
      filePath: "file",
      content: '<a href="/home" title="Home"></a>',
      kind: "html",
      document: new JSDOM('<a href="/home" title="Home"></a>').window.document
    };
    expect(EmptyLinkCheck.run(domTitle, rule)).toHaveLength(0);

    const domCaseMismatch = {
      filePath: "file",
      content: '<A href="/home"></A>',
      kind: "html",
      document: new JSDOM('<A href="/home"></A>').window.document
    };
    expect(EmptyLinkCheck.run(domCaseMismatch, rule)).toHaveLength(1);
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

    const domMissing = {
      filePath: "file",
      content: "<main></main>",
      kind: "html",
      document: new JSDOM("<main></main>").window.document
    };
    expect(MissingHeadingStructureCheck.run(domMissing, rule)).toHaveLength(1);

    const domPresent = {
      filePath: "file",
      content: "<main><h2>Title</h2></main>",
      kind: "html",
      document: new JSDOM("<main><h2>Title</h2></main>").window.document
    };
    expect(MissingHeadingStructureCheck.run(domPresent, rule)).toHaveLength(0);
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

    const gridRole = createContext('<table role="grid"><tr><td>Cell</td></tr></table>', "html");
    expect(LayoutTableCheck.run(gridRole, rule)).toHaveLength(1);
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

    const domMissing = {
      filePath: "file",
      content: "<table><tr><td>Cell</td></tr></table>",
      kind: "html",
      document: new JSDOM("<table><tr><td>Cell</td></tr></table>").window.document
    };
    expect(MissingTableHeaderCheck.run(domMissing, rule)).toHaveLength(1);

    const domPresent = {
      filePath: "file",
      content: "<table><tr><th>Header</th></tr></table>",
      kind: "html",
      document: new JSDOM("<table><tr><th>Header</th></tr></table>").window.document
    };
    expect(MissingTableHeaderCheck.run(domPresent, rule)).toHaveLength(0);

    const domPresentation = {
      filePath: "file",
      content: '<table role="presentation"><tr><td>Cell</td></tr></table>',
      kind: "html",
      document: new JSDOM('<table role="presentation"><tr><td>Cell</td></tr></table>').window.document
    };
    expect(MissingTableHeaderCheck.run(domPresentation, rule)).toHaveLength(0);

    const domMatchIndex = {
      filePath: "file",
      content: "<table><tbody><tr><td>Cell</td></tr></tbody></table>",
      kind: "html",
      document: new JSDOM("<table><tbody><tr><td>Cell</td></tr></tbody></table>").window.document
    };
    expect(MissingTableHeaderCheck.run(domMatchIndex, rule)).toHaveLength(1);
  });
});

describe("MissingAltTextCheck", () => {
  test("detects images missing alt text", () => {
    const missing = createContext('<img src="x" />', "html");
    expect(MissingAltTextCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<img alt="desc" src="x" />', "html");
    expect(MissingAltTextCheck.run(present, rule)).toHaveLength(0);

    const macro = createContext('<@img src="x" />', "html");
    expect(MissingAltTextCheck.run(macro, rule)).toHaveLength(1);

    const macroPresent = createContext('<@img src="x" alt="desc" />', "html");
    expect(MissingAltTextCheck.run(macroPresent, rule)).toHaveLength(0);

    const domContext = { ...missing, document: new JSDOM(missing.content).window.document };
    expect(MissingAltTextCheck.run(domContext, rule)).toHaveLength(1);

    const domPresent = { ...present, document: new JSDOM(present.content).window.document };
    expect(MissingAltTextCheck.run(domPresent, rule)).toHaveLength(0);
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

    const macro = createContext('<@link href="/" label="Home" />', "html");
    expect(MissingLinkTextCheck.run(macro, rule)).toHaveLength(0);

    const macroMissing = createContext('<@link href="/" />', "html");
    expect(MissingLinkTextCheck.run(macroMissing, rule)).toHaveLength(1);

    const nonLinkMacro = createContext("<@button />", "html");
    expect(MissingLinkTextCheck.run(nonLinkMacro, rule)).toHaveLength(0);

    const dom = new JSDOM('<a href="/"><span>Home</span></a>');
    const domContext = {
      filePath: "file",
      content: '<a href="/"><span>Home</span></a>',
      kind: "html",
      document: dom.window.document
    };
    expect(MissingLinkTextCheck.run(domContext, rule)).toHaveLength(0);

    const domMissing = new JSDOM('<a href="/"><img src="x" /></a>');
    const domMissingContext = {
      filePath: "file",
      content: '<a href="/"><img src="x" /></a>',
      kind: "html",
      document: domMissing.window.document
    };
    expect(MissingLinkTextCheck.run(domMissingContext, rule)).toHaveLength(1);
    expect(hasImageAltTextFromElement(domMissing.window.document.querySelector("a"))).toBe(false);

    const domImage = new JSDOM('<a href="/"><img alt="Home" src="x" /></a>');
    expect(hasImageAltTextFromElement(domImage.window.document.querySelector("a"))).toBe(true);
    expect(getMacroTextLabel("", "Body text")).toBe("Body text");
    expect(
      hasAccessibleLabelFromElement(dom.window.document.querySelector("a"), new Set())
    ).toBe(true);

    const domAriaLabel = new JSDOM('<a href="/" aria-label="Home"></a>');
    expect(
      hasAccessibleLabelFromElement(domAriaLabel.window.document.querySelector("a"), new Set())
    ).toBe(true);

    const domTitle = new JSDOM('<a href="/" title="Home"></a>');
    expect(
      hasAccessibleLabelFromElement(domTitle.window.document.querySelector("a"), new Set())
    ).toBe(true);

    const domLabelledBy = new JSDOM('<span id="label">Home</span><a href="/" aria-labelledby="label"></a>');
    expect(
      hasAccessibleLabelFromElement(domLabelledBy.window.document.querySelector("a"), new Set(["label"]))
    ).toBe(true);
  });
});

describe("LabelInNameCheck", () => {
  test("flags controls whose accessible name excludes the visible label", () => {
    const domMismatch = {
      filePath: "file",
      content: '<button aria-label="Save">Delete</button>',
      kind: "html",
      document: new JSDOM('<button aria-label="Save">Delete</button>').window.document
    };
    expect(LabelInNameCheck.run(domMismatch, rule)).toHaveLength(1);

    const domMatch = {
      filePath: "file",
      content: '<button aria-label="Save changes">Save</button>',
      kind: "html",
      document: new JSDOM('<button aria-label="Save changes">Save</button>').window.document
    };
    expect(LabelInNameCheck.run(domMatch, rule)).toHaveLength(0);

    const domLabelledByMismatch = {
      filePath: "file",
      content: '<span id="label">Cancel</span><button aria-labelledby="label">Submit</button>',
      kind: "html",
      document: new JSDOM('<span id="label">Cancel</span><button aria-labelledby="label">Submit</button>').window.document
    };
    expect(LabelInNameCheck.run(domLabelledByMismatch, rule)).toHaveLength(1);

    const domLabelledByMatch = {
      filePath: "file",
      content: '<span id="label">Submit</span><button aria-labelledby="label">Submit</button>',
      kind: "html",
      document: new JSDOM('<span id="label">Submit</span><button aria-labelledby="label">Submit</button>').window.document
    };
    expect(LabelInNameCheck.run(domLabelledByMatch, rule)).toHaveLength(0);

    const domCaseMismatch = {
      filePath: "file",
      content: '<BUTTON aria-label="Save">Delete</BUTTON>',
      kind: "html",
      document: new JSDOM('<BUTTON aria-label="Save">Delete</BUTTON>').window.document
    };
    expect(LabelInNameCheck.run(domCaseMismatch, rule)).toHaveLength(1);
  });

  test("skips controls without explicit accessible names or visible labels", () => {
    const domImplicit = {
      filePath: "file",
      content: "<button>Save</button>",
      kind: "html",
      document: new JSDOM("<button>Save</button>").window.document
    };
    expect(LabelInNameCheck.run(domImplicit, rule)).toHaveLength(0);

    const domIconOnly = {
      filePath: "file",
      content: '<button aria-label="Settings"></button>',
      kind: "html",
      document: new JSDOM('<button aria-label="Settings"></button>').window.document
    };
    expect(LabelInNameCheck.run(domIconOnly, rule)).toHaveLength(0);
  });

  test("handles input and link controls", () => {
    const domInputMismatch = {
      filePath: "file",
      content: '<input type="submit" value="Send" aria-label="Submit form" />',
      kind: "html",
      document: new JSDOM('<input type="submit" value="Send" aria-label="Submit form" />').window.document
    };
    expect(LabelInNameCheck.run(domInputMismatch, rule)).toHaveLength(1);

    const domInputMatch = {
      filePath: "file",
      content: '<input type="submit" value="Send" aria-label="Send form" />',
      kind: "html",
      document: new JSDOM('<input type="submit" value="Send" aria-label="Send form" />').window.document
    };
    expect(LabelInNameCheck.run(domInputMatch, rule)).toHaveLength(0);

    const domLinkMismatch = {
      filePath: "file",
      content: '<a href="/" aria-label="Home">Start</a>',
      kind: "html",
      document: new JSDOM('<a href="/" aria-label="Home">Start</a>').window.document
    };
    expect(LabelInNameCheck.run(domLinkMismatch, rule)).toHaveLength(1);
  });

  test("exposes helpers for normalization and candidate detection", () => {
    const dom = new JSDOM('<button aria-label="Save"> Save </button>');
    const button = dom.window.document.querySelector("button");
    expect(normalizeLabelText("  Save  ")).toBe("save");
    expect(getVisibleLabel(button)).toBe(" Save ");
    expect(getAccessibleNameCandidate(button, dom.window.document)).toBe("Save");
    expect(isInteractiveCandidate(button)).toBe(true);
  });

  test("covers helper branches and missing document handling", () => {
    const dom = new JSDOM('<div role="button">Press</div><div role="link">Go</div><a>Plain</a><div>Other</div>');
    const roleButton = dom.window.document.querySelector('[role="button"]');
    const roleLink = dom.window.document.querySelector('[role="link"]');
    const plainAnchor = dom.window.document.querySelector("a");
    const plainDiv = dom.window.document.querySelector("div:not([role])");
    expect(getVisibleLabel(roleButton)).toBe("Press");
    expect(getVisibleLabel(roleLink)).toBe("Go");
    expect(isInteractiveCandidate(roleLink)).toBe(true);
    expect(isInteractiveCandidate(plainAnchor)).toBe(false);
    expect(getVisibleLabel(plainDiv)).toBe("");
    expect(isInteractiveCandidate(plainDiv)).toBe(false);

    const domInput = new JSDOM('<input type="image" alt="Photo" title="Photo title" />');
    const input = domInput.window.document.querySelector("input");
    expect(getVisibleLabel(input)).toBe("Photo");
    expect(getAccessibleNameCandidate(input, domInput.window.document)).toBe("Photo title");

    const domInputButton = new JSDOM('<input type="submit" value="Send" />');
    const inputButton = domInputButton.window.document.querySelector("input");
    expect(getVisibleLabel(inputButton)).toBe("Send");

    const domMissingLabelledBy = new JSDOM('<button aria-labelledby="missing">Save</button>');
    const missingLabel = domMissingLabelledBy.window.document.querySelector("button");
    expect(getAccessibleNameCandidate(missingLabel, domMissingLabelledBy.window.document)).toBe("");

    expect(LabelInNameCheck.run({ filePath: "file", content: "<button>Save</button>", kind: "html" }, rule))
      .toHaveLength(0);

    const domNonInteractiveAnchor = {
      filePath: "file",
      content: "<a>Plain</a>",
      kind: "html",
      document: new JSDOM("<a>Plain</a>").window.document
    };
    expect(LabelInNameCheck.run(domNonInteractiveAnchor, rule)).toHaveLength(0);
  });
});

describe("MissingIframeTitleCheck", () => {
  test("detects iframes missing title", () => {
    const missing = createContext('<iframe src="video"></iframe>', "html");
    expect(MissingIframeTitleCheck.run(missing, rule)).toHaveLength(1);

    const present = createContext('<iframe title="Video" src="video"></iframe>', "html");
    expect(MissingIframeTitleCheck.run(present, rule)).toHaveLength(0);

    const domContext = { ...missing, document: new JSDOM(missing.content).window.document };
    expect(MissingIframeTitleCheck.run(domContext, rule)).toHaveLength(1);

    const domPresent = { ...present, document: new JSDOM(present.content).window.document };
    expect(MissingIframeTitleCheck.run(domPresent, rule)).toHaveLength(0);
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

    const blockMacroMissing = createContext("<@iframe src=\"video\"></@iframe>", "html");
    expect(MissingIframeTitleCheck.run(blockMacroMissing, rule)).toHaveLength(1);

    const blockMacroPresent = createContext("<@iframe title=\"Video\" src=\"video\"></@iframe>", "html");
    expect(MissingIframeTitleCheck.run(blockMacroPresent, rule)).toHaveLength(0);

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
    expect([...extractCssVariableDefinitions("--base-3:#fff; --base-4: rgb(1, 2, 3);")].sort())
      .toEqual([
        ["--base-3", "#fff"],
        ["--base-4", "rgb(1, 2, 3)"]
      ]);
    expect(extractCssVarName("var(--primary)")).toBe("--primary");
    expect(resolveCssVarFromStyle("var(--primary)", "--primary: #333; color: var(--primary);"))
      .toBe("#333");
    expect(resolveColorWithContext("var(--primary)", "--primary: #333; color: var(--primary);"))
      .toBe("#333");
    const cssVariables = new Map([["--brand", "#fff"]]);
    expect(resolveColorWithContext("var(--brand)", "", cssVariables)).toBe("#fff");
    expect(resolveColorWithContext("var(--loop)", "", new Map([["--loop", "var(--loop)"]])))
      .toBeNull();
    expect(shouldDefaultBackground("html")).toBe(true);
    expect(shouldDefaultBackground("xaml")).toBe(false);
    expect(parseHexColor("#12")).toBeNull();
    expect(parseHexColor("#gggggg")).toBeNull();
    expect(parseRgbValue("")).toBeNull();
    expect(parseAlphaValue("")).toBeNull();
    expect(parseRgbColor("rgb(10 20)")).toBeNull();
    expect(parseRgbColor("not-a-color")).toBeNull();
    expect(parseHslColor("hsl(0 0%)")).toBeNull();
    expect(parseColor("hsl(bad 0% 0%)")).toBeNull();
    expect(extractXamlFallback("{Binding FallbackValue=#000}")) .toBe("#000");
    expect(extractXamlFallback("{Binding Value=#000}")).toBeNull();
    expect(resolveStaticColor("var(--primary, #fff)")).toBe("#fff");
    expect(resolveStaticColor("{Binding FallbackValue=#fff}")).toBe("#fff");
    expect(resolveStaticColor("")) .toBeNull();
    expect(parseColor("hsl(0, 0%, 0%)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("hsl(0 0% 0% / 50%)")).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor("hsl(3.1416rad 0% 0%)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor("hsl(0.5turn 100% 50%)")).toEqual({ r: 0, g: 1, b: 1, a: 1 });
    expect(parseColor("red")).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(parseColor("rgb(255 255 255 / 50%)")).toEqual({ r: 1, g: 1, b: 1, a: 0.5 });
    expect(blendColors({ r: 1, g: 1, b: 1, a: 0.5 }, { r: 0, g: 0, b: 0, a: 1 }))
      .toEqual({ r: 0.5, g: 0.5, b: 0.5, a: 1 });

    const htmlContext = createContext('<div style="color:#777; background-color:#888"></div>', "html");
    const htmlIssues = InsufficientContrastCheck.run(htmlContext, rule);
    expect(htmlIssues).toHaveLength(1);
    expect(htmlIssues[0].evidence).toContain('Foreground: rgb(119, 119, 119)');
    expect(htmlIssues[0].evidence).toContain('Background: rgb(136, 136, 136)');

    const htmlSingleQuotedStyle = createContext(
      "<strong style = 'opacity: 1; color: rgb(255, 255, 255); background-color: rgb(255, 255, 255);'></strong>",
      "html"
    );
    expect(InsufficientContrastCheck.run(htmlSingleQuotedStyle, rule)).toHaveLength(1);
    expect(getCandidates(htmlSingleQuotedStyle)).toHaveLength(1);

    const htmlMissing = createContext('<div style="color:#777"></div>', "html");
    expect(InsufficientContrastCheck.run(htmlMissing, rule)).toHaveLength(1);

    const htmlVar = createContext(
      '<div style="--bg:#888;color:#777;background-color:var(--bg)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(htmlVar, rule)).toHaveLength(1);

    const htmlStyleTag = createContext(
      '<style>:root{--base-3:#fff;}.text{color:var(--base-3);}</style><p class="text">Hello</p>',
      "html"
    );
    expect(InsufficientContrastCheck.run(htmlStyleTag, rule)).toHaveLength(1);

    const cssContext = createContext('.a { color: #777; background-color: #888; }', "css");
    expect(InsufficientContrastCheck.run(cssContext, rule)).toHaveLength(1);

    const cssVarContext = createContext(':root { --base-3: #fff; } .text { color: var(--base-3); }', "css");
    expect(InsufficientContrastCheck.run(cssVarContext, rule)).toHaveLength(1);

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

    const cssNoForeground = createContext(".a { background-color: #000; }", "css");
    expect(getCandidates(cssNoForeground)).toHaveLength(0);

    const htmlNoForeground = createContext('<div style="background-color:#000"></div>', "html");
    expect(getCandidates(htmlNoForeground)).toHaveLength(0);
  });

  test("flags the 100-issue contrast sample file", () => {
    const samplePath = path.join(__dirname, "..", "sample_files", "contrast", "contrast-100-issues.html");
    const content = fs.readFileSync(samplePath, "utf-8");
    const sampleContext = createContext(content, "html");
    const issues = InsufficientContrastCheck.run(sampleContext, rule);
    expect(getCandidates(sampleContext)).toHaveLength(100);
    expect(issues).toHaveLength(100);
  });

  test("flags mixed contrast samples across multiple patterns", () => {
    const samplePath = path.join(__dirname, "..", "sample_files", "contrast", "contrast-100-mixed-issues.html");
    const content = fs.readFileSync(samplePath, "utf-8");
    const sampleContext = createContext(content, "html");
    const issues = InsufficientContrastCheck.run(sampleContext, rule);
    const evidenceText = issues.map((issue) => issue.evidence).join("\n");

    expect(getCandidates(sampleContext)).toHaveLength(100);
    expect(issues).toHaveLength(100);
    expect(evidenceText).toContain("linear-gradient");
    expect(evidenceText).toContain("background-image");
    expect(evidenceText).toContain("var(--mix-fg)");
    expect(evidenceText).toContain("font-size: 24px");
  });

  test("skips candidates with missing colors or sufficient contrast", () => {
    const cssContext = createContext(".a { color: #fff; }", "css");
    expect(InsufficientContrastCheck.run(cssContext, rule)).toHaveLength(1);

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
    expect(InsufficientContrastCheck.run(backgroundImageNoColor, rule)).toHaveLength(1);
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
    expect(extractColorTokens("transparent black")).toEqual(["transparent", "black"]);
    expect(extractCssVarName("")).toBeNull();
    expect(resolveCssVarFromStyle("var(--missing)", "")).toBeNull();
    expect(resolveCssVarFromStyle("red", "--primary: #333;")).toBeNull();
    expect(resolveColorWithContext(" ", "--primary: #333;")).toBeNull();
    expect(resolveColorWithContext("var(--missing)", "")).toBeNull();
    expect(parseFontSize("big")).toBeNull();
    expect(parseFontSize(".px")).toBeNull();
    expect(parseFontSize("12vh")).toBeNull();
    expect(parseFontSize("2em")).toBe(32);
    expect(blendColors({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1, a: 1 }))
      .toEqual({ r: 0, g: 0, b: 0, a: 1 });

    const unresolvedBackground = createContext(
      '<div style="color:#999;background-color:var(--missing)"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(unresolvedBackground, rule)).toHaveLength(1);

    const invalidBackground = createContext(
      '<div style="color:#999;background-color:not-a-color"></div>',
      "html"
    );
    expect(InsufficientContrastCheck.run(invalidBackground, rule)).toHaveLength(1);

    const invalidXamlBackground = createContext(
      '<TextBlock Foreground="#777" Background="not-a-color" />',
      "xaml"
    );
    expect(InsufficientContrastCheck.run(invalidXamlBackground, rule)).toHaveLength(0);
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

describe("MediaAlternativeCheck", () => {
  test("flags media missing captions and descriptions", () => {
    const content = '<video src="clip.mp4"></video><audio src="song.mp3"></audio>';
    const document = new JSDOM(content).window.document;
    const issues = MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(3);
  });

  test("accepts tracks or transcript links", () => {
    const content = '<div><video><track kind="captions" /><track kind="descriptions" /></video><a href="#">Transcript</a></div>';
    const document = new JSDOM(content).window.document;
    expect(MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("skips aria-hidden media", () => {
    const content = '<video aria-hidden="true"></video>';
    const document = new JSDOM(content).window.document;
    expect(MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("returns no issues without a document", () => {
    const context = createContext('<video src="clip.mp4"></video>');
    expect(MediaAlternativeCheck.run(context, rule)).toHaveLength(0);
  });

  test("accepts captions on audio elements", () => {
    const content = '<audio><track kind="captions" /></audio>';
    const document = new JSDOM(content).window.document;
    expect(MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("accepts transcript-only media", () => {
    const content = '<div><audio></audio><a href="#">Transcript</a></div>';
    const document = new JSDOM(content).window.document;
    expect(MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("accepts descriptions without captions", () => {
    const content = '<video><track kind="descriptions" /></video>';
    const document = new JSDOM(content).window.document;
    const issues = MediaAlternativeCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("captions");
  });
});

describe("SensoryCharacteristicsCheck", () => {
  test("detects sensory-based instructions", () => {
    const context = createContext("<p>Click the red button on the left.</p>");
    expect(SensoryCharacteristicsCheck.run(context, rule)).toHaveLength(1);
    expect(extractText("<script>ignore</script><p>Text</p>")).toContain("Text");
  });

  test("ignores non-instructional color mentions", () => {
    const context = createContext("<p>The red fox jumps.</p>");
    expect(SensoryCharacteristicsCheck.run(context, rule)).toHaveLength(0);
  });

  test("ignores content without sensory cues", () => {
    const context = createContext("<p>Submit the form to continue.</p>");
    expect(SensoryCharacteristicsCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("OrientationLockCheck", () => {
  test("detects orientation locks", () => {
    const context = createContext("screen.orientation.lock('portrait');", "js");
    expect(OrientationLockCheck.run(context, rule)).toHaveLength(1);
  });

  test("ignores content without orientation locks", () => {
    const context = createContext("console.log('ok');", "js");
    expect(OrientationLockCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("AudioControlCheck", () => {
  test("flags autoplay media without controls", () => {
    const content = '<audio autoplay src="song.mp3"></audio>';
    const document = new JSDOM(content).window.document;
    expect(AudioControlCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(1);
  });

  test("allows muted or controlled autoplay", () => {
    const content = '<audio autoplay controls src="song.mp3"></audio>';
    const document = new JSDOM(content).window.document;
    expect(AudioControlCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("ignores non-autoplay media", () => {
    const content = '<audio src="song.mp3"></audio>';
    const document = new JSDOM(content).window.document;
    expect(AudioControlCheck.run({ filePath: "file", content, kind: "html", document }, rule)).toHaveLength(0);
  });

  test("returns no issues without a document", () => {
    const context = createContext('<audio autoplay src="song.mp3"></audio>');
    expect(AudioControlCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("TextResizeCheck", () => {
  test("detects text-size-adjust restrictions", () => {
    const context = createContext(".text { text-size-adjust: none; }", "css");
    expect(TextResizeCheck.run(context, rule)).toHaveLength(1);
  });
});

describe("ImagesOfTextCheck", () => {
  test("detects image classes that imply text", () => {
    const context = createContext('<img class="text-image" src="text.png" />');
    expect(ImagesOfTextCheck.run(context, rule)).toHaveLength(1);
  });

  test("ignores images without text hints", () => {
    const context = createContext('<img class="hero" src="banner.png" />');
    expect(ImagesOfTextCheck.run(context, rule)).toHaveLength(0);
  });

  test("detects data-image-text markers", () => {
    const context = createContext('<img data-image-text="text" src="text.png" />');
    expect(ImagesOfTextCheck.run(context, rule)).toHaveLength(1);
  });

  test("detects id-based text hints", () => {
    const context = createContext('<img id="button-text" src="text.png" />');
    expect(ImagesOfTextCheck.run(context, rule)).toHaveLength(1);
  });
});

describe("TextSpacingCheck", () => {
  test("flags spacing overrides and nowrap", () => {
    const context = createContext(
      '.text { line-height: 1.2 !important; white-space: nowrap; }',
      "css"
    );
    expect(TextSpacingCheck.run(context, rule)).toHaveLength(2);
  });

  test("ignores flexible spacing rules", () => {
    const context = createContext('.text { line-height: 1.5; }', "css");
    expect(TextSpacingCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("HoverFocusContentCheck", () => {
  test("detects hover or focus content toggles", () => {
    const context = createContext('.tooltip:hover { display: block; }', "css");
    expect(HoverFocusContentCheck.run(context, rule)).toHaveLength(1);
  });

  test("ignores hover styles without visibility changes", () => {
    const context = createContext('.tooltip:hover { color: red; }', "css");
    expect(HoverFocusContentCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("InteractionLimitsCheck", () => {
  test("detects interaction patterns", () => {
    const context = createContext(
      '<div accesskey="s" onkeydown="if (event.keyCode === 9) { event.preventDefault(); }"></div>' +
        '<meta http-equiv="refresh" content="5" />' +
        '<script>setTimeout(() => {}, 1000); window.addEventListener("deviceorientation", () => {});</script>' +
        '<marquee>scroll</marquee>' +
        '<div ontouchstart="go()"></div>' +
        '<input onchange="location.href=\"/next\"" />',
      "html"
    );
    const issues = InteractionLimitsCheck.run(context, rule);
    expect(issues.length).toBeGreaterThan(5);
  });
});

describe("NavigationStructureCheck", () => {
  test("collects nav sequences", () => {
    const dom = new JSDOM('<nav><a href="#a">Home</a></nav>');
    const sequences = collectNavSequences(dom.window.document);
    expect(sequences).toEqual([["home"]]);
  });

  test("flags focus order and missing navigation aids", () => {
    const context = createContext('<button tabindex="2">Go</button>');
    const issues = NavigationStructureCheck.run({ ...context, document: new JSDOM(context.content).window.document }, rule);
    expect(issues).toHaveLength(2);
  });

  test("flags inconsistent nav labels", () => {
    const content =
      '<nav><a href="/home">Home</a></nav>' +
      '<nav><a href="/home">Start</a></nav>';
    const document = new JSDOM(content).window.document;
    const issues = NavigationStructureCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.some((issue) => issue.message.includes("inconsistent labels"))).toBe(true);
  });

  test("recognizes search inputs for multiple ways", () => {
    const content = '<input type="search" aria-label="Search site" />';
    const document = new JSDOM(content).window.document;
    const issues = NavigationStructureCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.some((issue) => issue.message.includes("multiple ways"))).toBe(false);
  });

  test("allows consistent navigation sequences", () => {
    const content =
      '<nav><a href="/home">Home</a><a href="/about">About</a></nav>' +
      '<nav><a href="/home">Home</a><a href="/about">About</a></nav>';
    const document = new JSDOM(content).window.document;
    const issues = NavigationStructureCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.some((issue) => issue.message.includes("Navigation order"))).toBe(false);
  });

  test("skips links without text or href", () => {
    const content = '<nav><a href=""></a><a>Label</a></nav>';
    const document = new JSDOM(content).window.document;
    const issues = NavigationStructureCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.some((issue) => issue.message.includes("inconsistent labels"))).toBe(false);
  });

  test("accepts site map links as navigation alternatives", () => {
    const content = '<a href="/sitemap">Site map</a>';
    const document = new JSDOM(content).window.document;
    const issues = NavigationStructureCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.some((issue) => issue.message.includes("multiple ways"))).toBe(false);
  });

  test("returns no issues without a document", () => {
    const context = createContext("<nav></nav>");
    expect(NavigationStructureCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("FocusVisibleCheck", () => {
  test("flags removed focus indicators", () => {
    const context = createContext('a:focus { outline: none; }', "css");
    expect(FocusVisibleCheck.run(context, rule)).toHaveLength(1);
  });

  test("ignores focus styling that preserves indicators", () => {
    const context = createContext('a:focus { outline: 2px solid #000; }', "css");
    expect(FocusVisibleCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("LanguageOfPartsCheck", () => {
  test("detects data-language without lang", () => {
    const context = createContext('<span data-lang="fr">Bonjour</span>');
    expect(LanguageOfPartsCheck.run(context, rule)).toHaveLength(1);
  });

  test("ignores elements that already define lang", () => {
    const context = createContext('<span data-lang="fr" lang="fr">Bonjour</span>');
    expect(LanguageOfPartsCheck.run(context, rule)).toHaveLength(0);
  });

  test("ignores elements without language metadata", () => {
    const context = createContext("<span>Hello</span>");
    expect(LanguageOfPartsCheck.run(context, rule)).toHaveLength(0);
  });

  test("detects data-language attributes", () => {
    const context = createContext('<span data-language="es">Hola</span>');
    expect(LanguageOfPartsCheck.run(context, rule)).toHaveLength(1);
  });

  test("returns no issues for empty content", () => {
    const context = createContext("");
    expect(LanguageOfPartsCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("ErrorHandlingCheck", () => {
  test("detects missing error messaging, suggestions, and confirmation", () => {
    const content =
      '<input aria-invalid="true" />' +
      '<input pattern="[A-Z]+" />' +
      '<form data-destructive="true"><input type="text" name="name" /></form>' +
      '<div class="toast">Saved</div>';
    const document = new JSDOM(content).window.document;
    const issues = ErrorHandlingCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  test("confirmation helper detects confirm inputs", () => {
    const dom = new JSDOM('<form><input type="checkbox" name="confirm" /></form>');
    expect(hasConfirmationControl(dom.window.document.querySelector("form"))).toBe(true);
  });

  test("accepts error messaging when hints are present", () => {
    const content =
      '<input aria-invalid="true" aria-errormessage="err" />' +
      '<input pattern="[A-Z]+" title="Only uppercase" />' +
      '<form data-destructive="true"><input type="text" name="confirm" /></form>' +
      '<div class="status" role="status">Saved</div>';
    const document = new JSDOM(content).window.document;
    const issues = ErrorHandlingCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(0);
  });

  test("ignores non-status classes", () => {
    const content = '<div class="card">Saved</div>';
    const document = new JSDOM(content).window.document;
    const issues = ErrorHandlingCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(0);
  });

  test("returns no issues without a document", () => {
    const context = createContext('<input aria-invalid="true" />');
    expect(ErrorHandlingCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("DuplicateIdCheck", () => {
  test("detects duplicate ids", () => {
    const content = '<div id="dup"></div><span id="dup"></span>';
    const document = new JSDOM(content).window.document;
    const issues = DuplicateIdCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(1);
  });

  test("ignores unique ids", () => {
    const content = '<div id="one"></div><span id="two"></span>';
    const document = new JSDOM(content).window.document;
    const issues = DuplicateIdCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(0);
  });

  test("ignores empty id values", () => {
    const content = '<div id=""></div>';
    const document = new JSDOM(content).window.document;
    const issues = DuplicateIdCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(0);
  });

  test("handles multiple duplicates", () => {
    const content = '<div id="dup"></div><span id="unique"></span><p id="dup"></p>';
    const document = new JSDOM(content).window.document;
    const issues = DuplicateIdCheck.run({ filePath: "file", content, kind: "html", document }, rule);
    expect(issues).toHaveLength(1);
  });

  test("returns no issues without a document", () => {
    const context = createContext('<div id="dup"></div><span id="dup"></span>');
    expect(DuplicateIdCheck.run(context, rule)).toHaveLength(0);
  });
});

describe("sample file expectations", () => {
  test("verifies mixed complex expectations across checks", () => {
    const samplePath = path.join(__dirname, "..", "sample_files", "mixed", "complex-expectations.html");
    const content = fs.readFileSync(samplePath, "utf-8");
    const document = new JSDOM(content).window.document;
    const context = { ...createContext(content, "html"), document };

    expect(MissingDocumentLanguageCheck.run(context, rule)).toHaveLength(1);
    expect(MissingPageTitleCheck.run(context, rule)).toHaveLength(1);
    expect(MissingSkipLinkCheck.run(context, rule)).toHaveLength(1);
    expect(EmptyHeadingCheck.run(context, rule)).toHaveLength(1);
    expect(EmptyLinkCheck.run(context, rule)).toHaveLength(1);
    expect(MissingLinkTextCheck.run(context, rule)).toHaveLength(1);
    expect(MissingAltTextCheck.run(context, rule)).toHaveLength(2);
    expect(MissingLabelCheck.run(context, rule)).toHaveLength(2);
    expect(MissingAutocompleteCheck.run(context, rule)).toHaveLength(3);
    expect(MissingFieldsetLegendCheck.run(context, rule)).toHaveLength(1);
    expect(MissingTableHeaderCheck.run(context, rule)).toHaveLength(1);
    expect(MissingIframeTitleCheck.run(context, rule)).toHaveLength(1);
    expect(UnlabeledButtonCheck.run(context, rule)).toHaveLength(1);
    expect(DuplicateIdCheck.run(context, rule)).toHaveLength(1);
  });

  test("verifies complex form samples for label and autocomplete coverage", () => {
    const samplePath = path.join(__dirname, "..", "sample_files", "forms", "complex-form-expectations.html");
    const content = fs.readFileSync(samplePath, "utf-8");
    const context = createContext(content, "html");

    expect(EmptyFormLabelCheck.run(context, rule)).toHaveLength(1);
    expect(OrphanedFormLabelCheck.run(context, rule)).toHaveLength(1);
    expect(MissingAutocompleteCheck.run(context, rule)).toHaveLength(2);
  });
});
