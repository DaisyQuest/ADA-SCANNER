const tryParseHex = (value) => {
  if (!value || !value.trim()) {
    return null;
  }

  let trimmed = value.trim();
  if (trimmed.startsWith("#")) {
    trimmed = trimmed.slice(1);
  }

  if (trimmed.length === 3) {
    trimmed = trimmed.split("").map((char) => `${char}${char}`).join("");
  } else if (trimmed.length === 4) {
    trimmed = trimmed
      .slice(1)
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  } else if (trimmed.length === 8) {
    trimmed = trimmed.slice(2);
  } else if (trimmed.length !== 6) {
    return null;
  }

  if (trimmed.length !== 6) {
    return null;
  }

  const r = Number.parseInt(trimmed.slice(0, 2), 16);
  const g = Number.parseInt(trimmed.slice(2, 4), 16);
  const b = Number.parseInt(trimmed.slice(4, 6), 16);

  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return null;
  }

  return { r: r / 255, g: g / 255, b: b / 255 };
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

module.exports = { tryParseHex, contrastRatio };
