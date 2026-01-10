# GoldMaster Testing Specification (node_engine)

## Purpose
GoldMaster tests provide deterministic, regression-safe snapshots of ADA/WCAG checks by scanning curated documents placed in `node_engine/goldmaster/`. Each file in that folder represents a standalone document that is scanned end-to-end, with the expectation that results (issues, counts, and locations) remain stable unless an intentional rule change is made.

## Scope
This specification covers **static scanning** and **runtime scanning** for the node_engine. It focuses on the ADA coverage already supported by the engine and ensures test cases exercise every check, including complex nesting and iframe-style compositions. Test cases must be **exhaustive**, targeting full branch coverage wherever possible.

## Supported file extensions
GoldMaster coverage must include **100 unique test cases per extension**:
- `.html`
- `.htm`
- `.cshtml`
- `.razor`
- `.xaml`
- `.ftl`
- `.js`

## Folder layout
```
node_engine/
  goldmaster/
    html/
    htm/
    cshtml/
    razor/
    xaml/
    ftl/
    js/
```

Each file is named using this convention:
`gm-<ext>-<nnn>-<slug>.<ext>`

Example:
`gm-html-042-contrast-gradient-button.html`

## Command syntax
Run GoldMaster scans via npm scripts:

```
npm run gold_master -- --all --outputDir <path>
npm run gold_master -- --ext html --outputDir <path>
npm run gm -- --ext razor
npm run gold_master -- --all --compare <baseline-report.json> --save <report.json>
```

### Options
- `--all`: Scan every supported extension.
- `--ext <extension>`: Limit scans to a single extension (repeatable or comma-separated).
- `--outputDir <path>`: Output directory for JSON reports.
- `--compare <path>`: Compare the current run against a saved report file.
- `--save <path>`: Save a combined report bundle to the provided path.

### Defaults
- `goldmaster` folder defaults to `node_engine/goldmaster/` (override with `GOLDMASTER_ROOT_DIR`).
- `rules` folder defaults to `../rules` (override with `GOLDMASTER_RULES_ROOT`, `RULES_ROOT`, or `ADA_RULES_ROOT`).
- `outputDir` defaults to `node_engine/goldmaster_output/` (override with `GOLDMASTER_OUTPUT_DIR`).

### Output
The command writes JSON files to `outputDir`:
- `goldmaster-summary.json`: One summary entry per extension.
- `goldmaster-<ext>.json`: Full report for each extension (`goldmaster-html.json`, `goldmaster-xaml.json`, etc.).

When `--save` is provided, the command also writes a combined report bundle (summary + per-extension reports) to the specified path.

## Required ADA coverage (must be represented in GoldMaster files)
All supported checks under `node_engine/src/checks` must be exercised in the GoldMaster suite. The current coverage list is:

- AbsolutePositioningCheck
- AudioControlCheck
- DeviceDependentEventHandlerCheck
- DuplicateIdCheck
- EmptyFormLabelCheck
- EmptyHeadingCheck
- EmptyLinkCheck
- ErrorHandlingCheck
- FixedWidthLayoutCheck
- FocusVisibleCheck
- HiddenFocusableElementCheck
- HiddenNavigationCheck
- HoverFocusContentCheck
- ImagesOfTextCheck
- InsufficientContrastCheck
- InteractionLimitsCheck
- InvalidAriaRoleCheck
- LabelInNameCheck
- LanguageOfPartsCheck
- LayoutTableCheck
- MediaAlternativeCheck
- MissingAltTextCheck
- MissingAutocompleteCheck
- MissingDocumentLanguageCheck
- MissingFieldsetLegendCheck
- MissingHeadingStructureCheck
- MissingIframeTitleCheck
- MissingLabelCheck
- MissingLinkTextCheck
- MissingPageTitleCheck
- MissingSkipLinkCheck
- MissingTableHeaderCheck
- NavigationStructureCheck
- NonWrappingContainerCheck
- OrientationLockCheck
- OrphanedFormLabelCheck
- RedundantTitleTextCheck
- SensoryCharacteristicsCheck
- TextResizeCheck
- TextSpacingCheck
- UnlabeledButtonCheck
- XamlMissingNameCheck

## Complex scenario requirements
Every extension’s inventory must include scenarios with:
- Deep nesting (10–20 levels or more where relevant).
- Multiple nested iframes (or Frame/WebBrowser equivalents for XAML).
- Mixed-language content, complex forms, and multi-step error handling.
- Combinations of contrast, labeling, navigation, and layout issues in a single document.

## Inventory management
- **GoldMasterTestCaseInventory_to_make.MD** lists all test cases that must be created.
- **GoldMasterTestCaseInventory_actually_made.MD** tracks completed test cases and the files that implement them.

When adding a new GoldMaster document:
1. Add the file to the appropriate `node_engine/goldmaster/<ext>/` folder.
2. Update `GoldMasterTestCaseInventory_actually_made.MD` with the new file name, extension, and checks exercised.
3. Ensure the test case reflects one or more of the required ADA checks above.

## Notes
- GoldMaster files should be deterministic and self-contained (no external assets or network calls).
- For XAML, interpret iframe scenarios as **Frame/WebBrowser** equivalents while preserving the nesting intent.
