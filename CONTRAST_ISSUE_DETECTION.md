# Contrast Issue Detection Progress

## Current behavior (aligned to WAVE-style expectations)
- Checks only fire when **both** foreground and background colors are explicitly defined or resolved from a fallback (e.g., CSS `var()` fallback or XAML `FallbackValue=`).
- Contrast ratios are computed using WCAG 2.0 AA thresholds:
  - Normal text must meet **4.5:1**.
  - Large text (≥ 18pt or ≥ 14pt bold) must meet **3:1**.
- Large text detection supports CSS/XAML font-size values in `px`, `pt`, `em`, and `rem` (with `1em/rem = 16px` assumption) and font-weight values of `bold`, `bolder`, `semibold`, or numeric weights ≥ 700.
- CSS `background` shorthand is supported when it resolves to a solid color.
- Node engine contrast detection parses gradient and background-image declarations to extract color stops or fallback colors for evaluation.

## WAVE parity guardrails (Scanner.Core)
- **Transparency:** colors with alpha transparency (`rgba(..., <1)`, hex with alpha not equal to `ff`, or `transparent`) are skipped.
- **Gradients/images:** background values containing gradients or `url(...)` are skipped.
- **Background images:** `background-image` values with gradients or URLs also skip contrast checks, even when a solid background color is present.
- **Filters:** elements with CSS filters (`filter`, `backdrop-filter`, `-webkit-filter`) are skipped unless explicitly set to `none`.

## Parsing enhancements
- Color parsing now supports:
  - Hex (3/6 digits) and opaque 4/8-digit hex values.
  - `rgb(...)` / `rgba(...)` formats (comma-separated or space-separated, with optional alpha).
  - A curated list of common named colors (`black`, `white`, `red`, `green`, `blue`, `gray/grey`, `yellow`, `cyan`, `magenta`, `purple`, `orange`, `pink`, `brown`).

## Known limitations / follow-ups
- Named color support is intentionally scoped to common colors to avoid additional dependencies; expand the list if broader CSS name coverage is required.
- Scanner.Core still skips gradients/images/filters to stay WAVE-aligned; revisit if parity is no longer required.
- Node engine evaluates gradients by testing extracted color stops; backgrounds with images but no color tokens remain unscorable and are skipped.
