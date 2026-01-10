const clamp01 = (value) => Math.min(1, Math.max(0, value));

const parseHexChannel = (value) => Number.parseInt(value, 16);

const expandHex = (value) => value.split("").map((char) => `${char}${char}`).join("");

const parseHexColor = (value, { alphaPosition = "end" } = {}) => {
  if (!value || !value.trim()) {
    return null;
  }

  let trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    trimmed = trimmed.slice(1);
  }

  if (![3, 4, 6, 8].includes(trimmed.length)) {
    return null;
  }

  if (trimmed.length === 3 || trimmed.length === 4) {
    trimmed = expandHex(trimmed);
  }

  let alpha = 1;
  if (trimmed.length === 8) {
    if (alphaPosition === "start") {
      alpha = parseHexChannel(trimmed.slice(0, 2)) / 255;
      trimmed = trimmed.slice(2);
    } else {
      alpha = parseHexChannel(trimmed.slice(6, 8)) / 255;
      trimmed = trimmed.slice(0, 6);
    }
  }

  const r = parseHexChannel(trimmed.slice(0, 2));
  const g = parseHexChannel(trimmed.slice(2, 4));
  const b = parseHexChannel(trimmed.slice(4, 6));

  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return null;
  }

  return { r: r / 255, g: g / 255, b: b / 255, a: clamp01(alpha) };
};

const parseRgbValue = (value) => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1));
    if (Number.isNaN(percent)) {
      return null;
    }
    return clamp01(percent / 100) * 255;
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isNaN(numeric) ? null : numeric;
};

const parseAlphaValue = (value) => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1));
    return Number.isNaN(percent) ? null : clamp01(percent / 100);
  }

  const numeric = Number.parseFloat(normalized);
  return Number.isNaN(numeric) ? null : clamp01(numeric);
};

const splitFunctionalColor = (body) => {
  const [channelsRaw, alphaRaw] = body.split("/").map((segment) => segment.trim());
  const channelTokens = channelsRaw.split(/[\s,]+/).filter(Boolean);
  const alphaToken = alphaRaw || (channelTokens.length > 3 ? channelTokens[3] : null);
  return { channelTokens, alphaToken };
};

const parseRgbColor = (value) => {
  const match = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }

  const { channelTokens, alphaToken } = splitFunctionalColor(match[1]);
  if (channelTokens.length < 3) {
    return null;
  }

  const r = parseRgbValue(channelTokens[0]);
  const g = parseRgbValue(channelTokens[1]);
  const b = parseRgbValue(channelTokens[2]);
  if ([r, g, b].some((component) => component === null)) {
    return null;
  }

  const alpha = alphaToken ? parseAlphaValue(alphaToken) : 1;
  if (alpha === null) {
    return null;
  }

  return { r: clamp01(r / 255), g: clamp01(g / 255), b: clamp01(b / 255), a: alpha };
};

const parseHue = (value) => {
  const normalized = value.trim().toLowerCase();
  const numeric = Number.parseFloat(normalized);
  if (Number.isNaN(numeric)) {
    return null;
  }

  if (normalized.endsWith("turn")) {
    return ((numeric * 360) % 360 + 360) % 360;
  }

  if (normalized.endsWith("rad")) {
    return (((numeric * 180) / Math.PI) % 360 + 360) % 360;
  }

  const degrees = normalized.replace(/deg$/, "");
  const parsed = Number.parseFloat(degrees);
  return Number.isNaN(parsed) ? null : ((parsed % 360) + 360) % 360;
};

const parseHslChannel = (value) => {
  const normalized = value.trim();
  if (!normalized.endsWith("%")) {
    return null;
  }
  const percent = Number.parseFloat(normalized.slice(0, -1));
  return Number.isNaN(percent) ? null : clamp01(percent / 100);
};

const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: clamp01(r + m),
    g: clamp01(g + m),
    b: clamp01(b + m)
  };
};

const parseHslColor = (value) => {
  const match = value.trim().match(/^hsla?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }

  const { channelTokens, alphaToken } = splitFunctionalColor(match[1]);
  if (channelTokens.length < 3) {
    return null;
  }

  const hue = parseHue(channelTokens[0]);
  const saturation = parseHslChannel(channelTokens[1]);
  const lightness = parseHslChannel(channelTokens[2]);
  if ([hue, saturation, lightness].some((component) => component === null)) {
    return null;
  }

  const alpha = alphaToken ? parseAlphaValue(alphaToken) : 1;
  if (alpha === null) {
    return null;
  }

  const rgb = hslToRgb(hue, saturation, lightness);
  return { ...rgb, a: alpha };
};

const NAMED_COLORS = new Map([
  ["black", { r: 0, g: 0, b: 0, a: 1 }],
  ["white", { r: 1, g: 1, b: 1, a: 1 }],
  ["red", { r: 1, g: 0, b: 0, a: 1 }],
  ["green", { r: 0, g: 0.5, b: 0, a: 1 }],
  ["blue", { r: 0, g: 0, b: 1, a: 1 }],
  ["yellow", { r: 1, g: 1, b: 0, a: 1 }],
  ["cyan", { r: 0, g: 1, b: 1, a: 1 }],
  ["magenta", { r: 1, g: 0, b: 1, a: 1 }],
  ["gray", { r: 0.5, g: 0.5, b: 0.5, a: 1 }],
  ["grey", { r: 0.5, g: 0.5, b: 0.5, a: 1 }],
  ["transparent", { r: 0, g: 0, b: 0, a: 0 }]
]);

const parseColor = (value, { alphaPosition = "end" } = {}) => {
  if (!value || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    return parseHexColor(trimmed, { alphaPosition });
  }

  if (/^rgba?\(/i.test(trimmed)) {
    return parseRgbColor(trimmed);
  }

  if (/^hsla?\(/i.test(trimmed)) {
    return parseHslColor(trimmed);
  }

  const named = NAMED_COLORS.get(trimmed.toLowerCase());
  return named ? { ...named } : null;
};

const relativeLuminance = (color) => {
  const linearize = (value) =>
    value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
};

const contrastRatio = (foreground, background) => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

module.exports = {
  parseHexColor,
  parseRgbValue,
  parseAlphaValue,
  parseRgbColor,
  parseHslColor,
  parseColor,
  contrastRatio,
  clamp01
};
