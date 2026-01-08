const { getLineNumber } = require("./TextUtilities");
const { tryParseHex, contrastRatio } = require("./ColorContrastAnalyzer");

const styleRegex = /style="(?<style>[^"]+)"/gi;
const xamlElementRegex = /<(?<tag>[\w:.-]+)(?<attrs>[^>]*?)>/gi;
const cssBlockRegex = /(?<selector>[^\{]+)\{(?<body>[^}]+)\}/gis;

const parseCssColor = (style, property) => {
  const parts = style.split(";").filter(Boolean);
  for (const part of parts) {
    const kv = part.split(":", 2).map((segment) => segment.trim());
    if (kv.length !== 2) {
      continue;
    }

    if (kv[0].toLowerCase() === property.toLowerCase()) {
      return kv[1];
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
        const background = parseCssColor(body, "background-color");
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
      const background = parseCssColor(style, "background-color");
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

      const fg = tryParseHex(foreground);
      const bg = tryParseHex(background);
      if (!fg || !bg) {
        continue;
      }

      const ratio = contrastRatio(fg, bg);
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

module.exports = {
  InsufficientContrastCheck,
  parseCssColor,
  parseXmlAttribute,
  resolveStaticColor,
  extractCssVarFallback,
  extractXamlFallback,
  normalizeColorValue,
  getCandidates
};
