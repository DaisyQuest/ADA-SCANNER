const { getLineNumber } = require("./TextUtilities");
const { parseColor, contrastRatio, clamp01 } = require("./ColorContrastAnalyzer");

const styleRegex = /style="(?<style>[^"]+)"/gi;
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

const parseCssColor = (style, properties) => {
  const parts = style.split(";").filter(Boolean);
  for (const part of parts) {
    const kv = part.split(":", 2).map((segment) => segment.trim());
    if (kv.length !== 2) {
      continue;
    }

    const propertyList = Array.isArray(properties) ? properties : [properties];
    if (propertyList.some((property) => kv[0].toLowerCase() === property.toLowerCase())) {
      return extractCssColorToken(kv[1]) ?? kv[1];
    }
  }

  return null;
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
          background,
          index: match.index,
          snippet: match[0]
        };
      })
      .filter(Boolean);
  }

  if (kind === "css") {
    return Array.from(context.content.matchAll(cssBlockRegex))
      .map((match) => {
        const body = match.groups.body;
        const foreground = parseCssColor(body, "color");
        const background = parseCssColor(body, ["background-color", "background"]);
        if (!foreground || !background) {
          return null;
        }

        return {
          foreground,
          background,
          index: match.index,
          snippet: match[0]
        };
      })
      .filter(Boolean);
  }

  return Array.from(context.content.matchAll(styleRegex))
    .map((match) => {
      const style = match.groups.style;
      const foreground = parseCssColor(style, "color");
      const background = parseCssColor(style, ["background-color", "background"]);
      if (!foreground || !background) {
        return null;
      }

      return {
        foreground,
        background,
        index: match.index,
        snippet: match[0]
      };
    })
    .filter(Boolean);
};

const InsufficientContrastCheck = {
  id: "insufficient-contrast",
  applicableKinds: ["html", "htm", "cshtml", "razor", "xaml", "css"],
  run(context, rule) {
    const issues = [];
    const candidates = getCandidates(context);
    for (const candidate of candidates) {
      const foreground = resolveStaticColor(candidate.foreground);
      const background = resolveStaticColor(candidate.background);
      if (!foreground || !background) {
        continue;
      }

      const alphaPosition = context.kind.toLowerCase() === "xaml" ? "start" : "end";
      const fg = parseColor(foreground, { alphaPosition });
      const bg = parseColor(background, { alphaPosition });
      if (!fg || !bg) {
        continue;
      }

      const resolvedBackground = bg.a < 1
        ? blendColors(bg, { r: 1, g: 1, b: 1, a: 1 })
        : bg;
      const resolvedForeground = fg.a < 1
        ? blendColors(fg, resolvedBackground)
        : fg;

      const ratio = contrastRatio(resolvedForeground, resolvedBackground);
      if (ratio >= 4.5) {
        continue;
      }

      const line = getLineNumber(context.content, candidate.index);
      issues.push({
        ruleId: rule.id,
        checkId: InsufficientContrastCheck.id,
        filePath: context.filePath,
        line,
        message: `Color contrast ratio ${ratio.toFixed(2)} is below 4.5:1.`,
        evidence: candidate.snippet
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
  parseXmlAttribute,
  resolveStaticColor,
  extractCssVarFallback,
  extractXamlFallback,
  normalizeColorValue,
  getCandidates,
  blendColors
};
