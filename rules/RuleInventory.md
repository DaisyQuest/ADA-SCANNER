# Rule Inventory

This inventory is the shared catalog of rule definitions. It lists the rule IDs, their purpose, and the owning team folder per SPEC-016. The detailed sections below describe expected inputs, detection heuristics, and the findings shape that scanners should emit.

> **Coordination requirement**: Rule ownership and overlaps must be confirmed with the relevant team leads before any rule files are created. The owners listed below are the proposed defaults based on SPEC-016 and SPEC-008 and should be validated during kickoff.

## Directory layout (SPEC-016)

The rules directory must include the following team folders:

- `rules/contrast/`
- `rules/scanner-backend/`
- `rules/ui-frontend/`
- `rules/report-generation/`
- `rules/reflow/`
- `rules/aria-labels/`
- `rules/responsive-size/`
- `rules/hidden-navigation-elements/`
- `rules/error-message-at-top/`

## Directory ownership mapping (SPEC-016)

| Rule ID | Brief description | Assigned team folder |
| --- | --- | --- |
| ARIA-001 | Form inputs and controls missing accessible names | `rules/aria-labels/` |
| CONTRAST-001 | Text/background contrast below WCAG AA where colors are static | `rules/contrast/` |
| HIDDEN-NAV-001 | Navigation elements hidden from assistive tech or visibility rules | `rules/hidden-navigation-elements/` |
| ERROR-TOP-001 | Error summaries not placed at the top of the page/region | `rules/error-message-at-top/` |
| RESP-SIZE-001 | Fixed sizing that blocks responsive reflow at common breakpoints | `rules/responsive-size/` |
| REFLOW-001 | Layout containers that prevent reflow under zoom | `rules/reflow/` |

## Rule details

### ARIA-001 — Missing accessible name
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Identify form controls and interactive elements (`<input>`, `<select>`, `<textarea>`, `<button>`, elements with `role="button"`, `role="textbox"`, etc.).
  - Flag when none of the following are present: `aria-label`, `aria-labelledby` referencing an existing ID, `<label for>` association, or platform-specific equivalents (e.g., `AutomationProperties.Name` in XAML).
  - Exclude elements explicitly marked as `aria-hidden="true"` or disabled from user interaction.
- **Expected findings shape**:
  - `ruleId`: `ARIA-001`
  - `file`: source file path
  - `line`: line number where the unlabeled control is declared
  - `message`: "Missing accessible name for interactive control."

### CONTRAST-001 — Insufficient text contrast
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Extract static foreground/background color pairs from inline styles, CSS classes with resolved colors, or XAML properties (e.g., `Foreground`, `Background`).
  - Calculate contrast ratios for text smaller/larger than 18pt/14pt bold and compare against WCAG 2.0 AA thresholds.
  - Skip cases where colors are fully dynamic (e.g., bound or computed at runtime) and no static fallback is present.
- **Expected findings shape**:
  - `ruleId`: `CONTRAST-001`
  - `file`: source file path
  - `line`: line number where the color pair is defined
  - `message`: "Text contrast ratio below WCAG 2.0 AA threshold."

### HIDDEN-NAV-001 — Hidden navigation elements
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Detect navigation blocks (`<nav>`, elements with `role="navigation"`, XAML `NavigationView`) that are hidden via `display:none`, `visibility:hidden`, `aria-hidden="true"`, or off-screen positioning without alternative skip links.
  - Flag navigation containers that are visually hidden but still expected for keyboard/screen reader flow.
  - Exclude explicitly decorative or duplicate navigation that is properly labeled as redundant.
- **Expected findings shape**:
  - `ruleId`: `HIDDEN-NAV-001`
  - `file`: source file path
  - `line`: line number where the navigation element is hidden
  - `message`: "Navigation element is hidden from assistive technology or visibility rules."

### ERROR-TOP-001 — Error message placement
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Identify error summary containers (e.g., `role="alert"`, `aria-live="assertive"`, `ValidationSummary` in XAML).
  - Verify the error summary appears before the primary form controls in DOM order (or within the top-most layout region in XAML).
  - Flag pages where inline field errors exist but no top summary is present.
- **Expected findings shape**:
  - `ruleId`: `ERROR-TOP-001`
  - `file`: source file path
  - `line`: line number where the error summary should appear
  - `message`: "Error summary is missing or not placed at the top of the form/region."

### RESP-SIZE-001 — Responsive sizing constraints
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Detect fixed widths/heights on layout containers or text regions (e.g., `width: 960px`, `Width="960"`) that prevent wrapping at common breakpoints.
  - Flag containers that lack responsive sizing attributes (`max-width`, `flex`, `Grid` star sizing) when nested in layouts intended to reflow.
  - Ignore cases where fixed sizing is paired with responsive alternatives in media queries or platform-specific adaptive triggers.
- **Expected findings shape**:
  - `ruleId`: `RESP-SIZE-001`
  - `file`: source file path
  - `line`: line number where the fixed sizing is declared
  - `message`: "Fixed sizing may block responsive reflow at smaller viewports."

### REFLOW-001 — Reflow blocking layout
- **Expected input artifacts**: XAML, Razor, HTML.
- **Detection heuristics**:
  - Identify containers with absolute positioning, fixed grids, or `min-width`/`min-height` combinations that prevent reflow at 320 CSS pixels or 400% zoom.
  - Flag content regions that require horizontal scrolling due to non-wrapping containers.
  - Exclude known exceptions like data grids that provide horizontal scrolling affordances and labels.
- **Expected findings shape**:
  - `ruleId`: `REFLOW-001`
  - `file`: source file path
  - `line`: line number where the reflow-blocking container is defined
  - `message`: "Layout prevents content reflow under zoom or narrow viewports."

## Ownership overlap notes

- **ARIA-001** and **ERROR-TOP-001**: confirm whether error summary labeling belongs to the ARIA labels team or the error-message-at-top team.
- **RESP-SIZE-001** and **REFLOW-001**: confirm whether responsive sizing checks overlap with reflow checks and define primary ownership to avoid duplication.
