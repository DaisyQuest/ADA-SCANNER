const { getLineNumber } = require("./TextUtilities");
const { parseColor, contrastRatio, clamp01 } = require("./ColorContrastAnalyzer");

const styleRegex = /style\s*=\s*(?:"(?<styleDouble>[^"]+)"|'(?<styleSingle>[^']+)')/gi;
const styleTagRegex = /<style[^>]*>(?<css>[\s\S]*?)<\/style>/gi;
const xamlElementRegex = /<(?<tag>[\w:.-]+)(?<attrs>[^>]*?)>/gi;
const cssBlockRegex = /(?<selector>[^\{]+)\{(?<body>[^}]+)\}/gis;

const extractCssColorToken = (value) => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const tokens = normalized
    .split(/\s+(?![^()]*\))/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    if (/^url\(/i.test(token)) {
      continue;
    }

    if (
      token.startsWith("#") ||
      /^rgba?\(/i.test(token) ||
      /^hsla?\(/i.test(token) ||
      /^[a-z]+$/i.test(token)
    ) {
      return token;
    }
  }

  return null;
};

const extractColorTokens = (value) => {
  if (!value || !value.trim()) {
    return [];
  }

  const tokens = [];
  const normalized = value.trim();
  const colorMatches = normalized.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)/g);
  if (colorMatches) {
    tokens.push(...colorMatches);
  }

  const wordMatches = normalized.match(/\b[a-z]+\b/gi) ?? [];
  for (const word of wordMatches) {
    if (parseColor(word)) {
      tokens.push(word);
    } else if (word.toLowerCase() === "currentcolor") {
      tokens.push(word);
    }
  }

  return [...new Set(tokens)];
};

const parseCssValue = (style, properties) => {
  const parts = style.split(";").filter(Boolean);
  for (const part of parts) {
    const kv = part.split(":", 2).map((segment) => segment.trim());
    if (kv.length !== 2) {
      continue;
    }

    const propertyList = Array.isArray(properties) ? properties : [properties];
    if (propertyList.some((property) => kv[0].toLowerCase() === property.toLowerCase())) {
      return kv[1];
    }
  }

  return null;
};

const parseCssColor = (style, properties) => {
  const value = parseCssValue(style, properties);
  return value ? extractCssColorToken(value) ?? value : null;
};

const parseCssBackgroundColors = (style) => {
  const colors = [];
  const backgroundColor = parseCssValue(style, "background-color");
  if (backgroundColor) {
    colors.push(backgroundColor);
  }

  const background = parseCssValue(style, "background");
  if (background) {
    colors.push(...extractColorTokens(background));
  }

  const backgroundImage = parseCssValue(style, "background-image");
  if (backgroundImage) {
    colors.push(...extractColorTokens(backgroundImage));
  }

  return [...new Set(colors.filter(Boolean))];
};

const parseXmlAttribute = (attributes, attribute) => {
  const pattern = new RegExp(`${attribute}\\s*=\\s*\"(?<value>[^\"]+)\"`, "i");
  const match = attributes.match(pattern);
  return match && match.groups ? match.groups.value.trim() : null;
};

const normalizeColorValue = (value) => {
  let trimmed = value.trim();
  if (trimmed.toLowerCase().endsWith("!important")) {
    trimmed = trimmed.slice(0, -"!important".length).trim();
  }

  return trimmed;
};

const extractCssVarFallback = (value) => {
  const start = value.indexOf("(");
  const end = value.lastIndexOf(")");
  if (start < 0 || end <= start) {
    return null;
  }

  const inner = value.slice(start + 1, end);
  const commaIndex = inner.indexOf(",");
  if (commaIndex < 0) {
    return null;
  }

  return normalizeColorValue(inner.slice(commaIndex + 1));
};

const extractCssVariableDefinitions = (content) => {
  if (!content || !content.trim()) {
    return new Map();
  }

  const definitions = new Map();
  const matches = content.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g);
  for (const match of matches) {
    const [, name, rawValue] = match;
    const normalized = normalizeColorValue(rawValue);
    const color = extractCssColorToken(normalized) ?? extractColorTokens(normalized)[0];
    if (color) {
      definitions.set(name, color);
    }
  }

  return definitions;
};

const extractXamlFallback = (value) => {
  const fallbackIndex = value.toLowerCase().indexOf("fallbackvalue=");
  if (fallbackIndex < 0) {
    return null;
  }

  const start = fallbackIndex + "FallbackValue=".length;
  const remainder = value.slice(start);
  const endIndex = remainder.search(/[,}]/);
  const candidate = endIndex >= 0 ? remainder.slice(0, endIndex) : remainder;
  return normalizeColorValue(candidate.trim().replace(/^"|"$/g, ""));
};

const resolveStaticColor = (value) => {
  if (!value || !value.trim()) {
    return null;
  }

  let trimmed = normalizeColorValue(value);
  if (trimmed.toLowerCase().startsWith("var(")) {
    trimmed = extractCssVarFallback(trimmed) ?? "";
  }

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    trimmed = extractXamlFallback(trimmed) ?? "";
  }

  return trimmed ? trimmed : null;
};

const parseFontSize = (value) => {
  if (!value || !value.trim()) {
    return null;
  }

  const match = value.trim().match(/^(?<size>[0-9.]+)\s*(?<unit>[a-z%]*)$/i);
  if (!match || !match.groups) {
    return null;
  }

  const size = Number.parseFloat(match.groups.size);
  if (Number.isNaN(size)) {
    return null;
  }

  const unit = match.groups.unit.toLowerCase();
  switch (unit) {
    case "":
    case "px":
      return size;
    case "pt":
      return (size * 96) / 72;
    case "em":
    case "rem":
      return size * 16;
    default:
      return null;
  }
};

const parseCssFontSize = (style) => parseFontSize(parseCssValue(style, "font-size"));

const parseFontWeight = (value) => {
  if (!value || !value.trim()) {
    return false;
  }

  const numeric = Number.parseFloat(value.trim());
  if (!Number.isNaN(numeric)) {
    return numeric >= 700;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "bold" || normalized === "bolder" || normalized === "semibold";
};

const getRequiredContrastRatio = ({ fontSizePx, isBold }) => {
  if (!fontSizePx) {
    return 4.5;
  }

  const largeText = fontSizePx >= 24 || (fontSizePx >= 18.6667 && isBold);
  return largeText ? 3.0 : 4.5;
};

const DEFAULT_BACKGROUND = "#ffffff";
const RGB_CHANNEL_SCALE = 255;

const extractCssVarName = (value) => {
  if (!value || !value.trim()) {
    return null;
  }

  const match = value.trim().match(/^var\(\s*(--[^,\s)]+)\s*(?:,.*)?\)$/i);
  return match ? match[1] : null;
};

const isCurrentColorToken = (value) => value?.trim().toLowerCase() === "currentcolor";

const resolveCssVarFromStyle = (value, style) => {
  if (!style) {
    return null;
  }

  const varName = extractCssVarName(value);
  if (!varName) {
    return null;
  }

  const varValue = parseCssValue(style, varName);
  return varValue ? normalizeColorValue(varValue) : null;
};

const resolveColorWithContext = (value, style, cssVariables = new Map(), visited = new Set()) => {
  const resolved = resolveStaticColor(value);
  if (resolved) {
    return resolved;
  }

  if (!value || !value.trim()) {
    return null;
  }

  const varName = extractCssVarName(value);
  if (varName && cssVariables instanceof Map) {
    if (visited.has(varName)) {
      return null;
    }

    const variableValue = cssVariables.get(varName);
    if (variableValue) {
      visited.add(varName);
      const resolvedVariable = resolveColorWithContext(variableValue, style, cssVariables, visited);
      if (resolvedVariable) {
        return resolvedVariable;
      }

      const staticVariable = resolveStaticColor(variableValue);
      return staticVariable ?? null;
    }
  }

  const fallback = resolveCssVarFromStyle(value, style);
  return fallback ? resolveStaticColor(fallback) ?? fallback : null;
};

const shouldDefaultBackground = (kind) =>
  ["html", "htm", "cshtml", "razor", "css"].includes(kind.toLowerCase());

const formatRgbChannel = (value) => Math.round(clamp01(value) * RGB_CHANNEL_SCALE);

const formatAlphaValue = (value) => {
  const rounded = Math.round(clamp01(value) * 100) / 100;
  return rounded.toString();
};

const formatColor = (color) => {
  const r = formatRgbChannel(color.r);
  const g = formatRgbChannel(color.g);
  const b = formatRgbChannel(color.b);
  const alpha = color.a ?? 1;
  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${formatAlphaValue(alpha)})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
};

const MAX_EVIDENCE_SAMPLE_LENGTH = 200;

const formatEvidenceSample = (value) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_EVIDENCE_SAMPLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_EVIDENCE_SAMPLE_LENGTH)}…`;
};

const getSelectorUsage = (selector, document) => {
  if (!selector || !document) {
    return null;
  }

  const trimmed = selector.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const matches = Array.from(document.querySelectorAll(trimmed));
    const sample = matches.length > 0
      ? formatEvidenceSample(matches[0].outerHTML)
      : null;
    return {
      selector: trimmed,
      matchedCount: matches.length,
      sample
    };
  } catch (error) {
    return {
      selector: trimmed,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

const buildSelectorEvidence = (usage) => {
  if (!usage) {
    return [];
  }

  const lines = [`Selector: ${usage.selector}`];
  if (usage.error) {
    lines.push(`Selector evaluation: ${usage.error}`);
    return lines;
  }

  lines.push(`Matched elements: ${usage.matchedCount}`);
  if (usage.sample) {
    lines.push(`Sample: ${usage.sample}`);
  }

  return lines;
};

const extractStyleTagBlocks = (content) =>
  Array.from(content.matchAll(styleTagRegex))
    .map((match) => {
      const css = match.groups?.css ?? "";
      if (!css) {
        return null;
      }

      const offset = match.index + match[0].indexOf(css);
      return { css, offset };
    })
    .filter(Boolean);

const collectCssVariables = (context) => {
  const kind = context.kind.toLowerCase();
  if (kind === "xaml") {
    return new Map();
  }

  const definitions = new Map();
  const addDefinitions = (content) => {
    for (const [name, value] of extractCssVariableDefinitions(content)) {
      definitions.set(name, value);
    }
  };

  if (kind === "css") {
    addDefinitions(context.content);
    return definitions;
  }

  for (const match of context.content.matchAll(styleRegex)) {
    const style = match.groups.styleDouble ?? match.groups.styleSingle;
    addDefinitions(style ?? "");
  }

  for (const block of extractStyleTagBlocks(context.content)) {
    addDefinitions(block.css);
  }

  return definitions;
};

const getCandidates = (context) => {
  const kind = context.kind.toLowerCase();
  if (kind === "xaml") {
    return Array.from(context.content.matchAll(xamlElementRegex))
      .map((match) => {
        const attrs = match.groups.attrs;
        const foreground = parseXmlAttribute(attrs, "Foreground");
        const background = parseXmlAttribute(attrs, "Background");
        if (!foreground || !background) {
          return null;
        }

        return {
          foreground,
          backgroundColors: [background],
          fontSizePx: parseFontSize(parseXmlAttribute(attrs, "FontSize")),
          isBold: parseFontWeight(parseXmlAttribute(attrs, "FontWeight")),
          index: match.index,
          snippet: match[0],
          style: null,
          selector: null
        };
      })
      .filter(Boolean);
  }

  if (kind === "css") {
    return Array.from(context.content.matchAll(cssBlockRegex))
      .map((match) => {
        const body = match.groups.body;
        const foreground = parseCssColor(body, "color");
        const backgroundColors = parseCssBackgroundColors(body);
        if (!foreground) {
          return null;
        }

        return {
          foreground,
          backgroundColors,
          fontSizePx: parseCssFontSize(body),
          isBold: parseFontWeight(parseCssValue(body, "font-weight")),
          index: match.index,
          snippet: match[0],
          style: body,
          selector: match.groups.selector?.trim() ?? null
        };
      })
      .filter(Boolean);
  }

  const inlineCandidates = Array.from(context.content.matchAll(styleRegex))
    .map((match) => {
      const style = match.groups.styleDouble ?? match.groups.styleSingle;
      const foreground = parseCssColor(style, "color");
      const backgroundColors = parseCssBackgroundColors(style);
      if (!foreground) {
        return null;
      }

      return {
        foreground,
        backgroundColors,
        fontSizePx: parseCssFontSize(style),
        isBold: parseFontWeight(parseCssValue(style, "font-weight")),
        index: match.index,
        snippet: match[0],
        style,
        selector: null
      };
    })
    .filter(Boolean);

  const styleTagCandidates = extractStyleTagBlocks(context.content)
    .flatMap((block) => Array.from(block.css.matchAll(cssBlockRegex))
      .map((match) => {
        const body = match.groups.body;
        const foreground = parseCssColor(body, "color");
        const backgroundColors = parseCssBackgroundColors(body);
        if (!foreground) {
          return null;
        }

        return {
          foreground,
          backgroundColors,
          fontSizePx: parseCssFontSize(body),
          isBold: parseFontWeight(parseCssValue(body, "font-weight")),
          index: block.offset + match.index,
          snippet: match[0],
          style: body,
          selector: match.groups.selector?.trim() ?? null
        };
      })
      .filter(Boolean));

  return [...inlineCandidates, ...styleTagCandidates];
};

const InsufficientContrastCheck = {
  id: "insufficient-contrast",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml", "css"],
  run(context, rule) {
    const issues = [];
    const candidates = getCandidates(context);
    const cssVariables = collectCssVariables(context);
    for (const candidate of candidates) {
      const foreground = resolveColorWithContext(candidate.foreground, candidate.style, cssVariables);
      if (!foreground) {
        continue;
      }

      const alphaPosition = context.kind.toLowerCase() === "xaml" ? "start" : "end";
      const fg = parseColor(foreground, { alphaPosition });
      if (!fg) {
        continue;
      }

      const backgroundColors = candidate.backgroundColors
        .map((color) => resolveColorWithContext(color, candidate.style, cssVariables))
        .map((color) => (isCurrentColorToken(color) ? foreground : color))
        .filter(Boolean);

      const parsedBackgrounds = backgroundColors
        .map((color) => ({ value: color, parsed: parseColor(color, { alphaPosition }) }))
        .filter((entry) => entry.parsed);
      if (parsedBackgrounds.length === 0 && shouldDefaultBackground(context.kind)) {
        const fallback = parseColor(DEFAULT_BACKGROUND, { alphaPosition });
        if (fallback) {
          parsedBackgrounds.push({ value: DEFAULT_BACKGROUND, parsed: fallback });
        }
      }

      if (parsedBackgrounds.length === 0) {
        continue;
      }

      const threshold = getRequiredContrastRatio(candidate);
      const ratios = parsedBackgrounds.map((backgroundEntry) => {
        const backgroundColor = backgroundEntry.parsed;
        const resolvedBackground = backgroundColor.a < 1
          ? blendColors(backgroundColor, { r: 1, g: 1, b: 1, a: 1 })
          : backgroundColor;
        const resolvedForeground = fg.a < 1
          ? blendColors(fg, resolvedBackground)
          : fg;
        return {
          ratio: contrastRatio(resolvedForeground, resolvedBackground),
          backgroundValue: backgroundEntry.value,
          foregroundColor: resolvedForeground,
          backgroundColor: resolvedBackground
        };
      });

      const lowestRatio = ratios.reduce((lowest, entry) =>
        entry.ratio < lowest.ratio ? entry : lowest,
      ratios[0]);
      if (lowestRatio.ratio >= threshold) {
        continue;
      }

      const usage = getSelectorUsage(candidate.selector, context.document);
      if (usage && usage.matchedCount === 0) {
        continue;
      }

      const line = getLineNumber(context.content, candidate.index);
      const usageEvidence = buildSelectorEvidence(usage);
      const evidence = [
        candidate.snippet,
        ...usageEvidence,
        `Foreground: ${formatColor(lowestRatio.foregroundColor)}`,
        `Background: ${formatColor(lowestRatio.backgroundColor)}`
      ]
        .filter((entry) => entry && entry.trim())
        .join("\n");
      issues.push({
        ruleId: rule.id,
        checkId: InsufficientContrastCheck.id,
        filePath: context.filePath,
        line,
        message: `Color contrast ratio ${lowestRatio.ratio.toFixed(2)} is below ${threshold.toFixed(1)}:1.`,
        evidence
      });
    }

    return issues;
  }
};

const blendColors = (foreground, background) => {
  const alpha = clamp01(foreground.a ?? 1);
  const inverse = 1 - alpha;
  return {
    r: clamp01(foreground.r * alpha + background.r * inverse),
    g: clamp01(foreground.g * alpha + background.g * inverse),
    b: clamp01(foreground.b * alpha + background.b * inverse),
    a: 1
  };
};

module.exports = {
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
  extractXamlFallback,
  normalizeColorValue,
  extractCssVarName,
  resolveCssVarFromStyle,
  resolveColorWithContext,
  parseFontSize,
  parseCssFontSize,
  parseFontWeight,
  getRequiredContrastRatio,
  formatColor,
  formatEvidenceSample,
  getCandidates,
  getSelectorUsage,
  blendColors,
  shouldDefaultBackground,
  collectCssVariables,
  extractStyleTagBlocks
};
