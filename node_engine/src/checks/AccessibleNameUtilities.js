const labelForRegex = /<label[^>]*for="([^"]+)"[^>]*>/gi;
const labelRangeRegex = /<label[^>]*>.*?<\/label>/gsi;
const idRegex = /id\s*=\s*"([^"]+)"/gi;
const tagRegex = /<[^>]+>/g;

const collectLabelForIds = (content) => {
  const ids = new Set();
  for (const match of content.matchAll(labelForRegex)) {
    const id = match[1];
    if (id && id.trim()) {
      ids.add(id.toLowerCase());
    }
  }

  return ids;
};

const collectLabelRanges = (content) => {
  const ranges = [];
  for (const match of content.matchAll(labelRangeRegex)) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  return ranges;
};

const collectElementIds = (content) => {
  const ids = new Set();
  for (const match of content.matchAll(idRegex)) {
    const id = match[1];
    if (id && id.trim()) {
      ids.add(id.toLowerCase());
    }
  }

  return ids;
};

const isWithinLabel = (index, labelRanges) =>
  labelRanges.some((range) => index >= range.start && index <= range.end);

const hasAriaLabel = (value) => Boolean(value && value.trim());

const hasValidAriaLabelledBy = (value, ids) => {
  if (!value || !value.trim()) {
    return false;
  }

  return value
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .some((token) => ids.has(token.toLowerCase()));
};

const hasTitle = (value) => Boolean(value && value.trim());

const hasLabelForId = (id, labelForIds) => Boolean(id && labelForIds.has(id.toLowerCase()));

const hasTextContent = (content) => Boolean(content.replace(tagRegex, "").trim());

module.exports = {
  collectLabelForIds,
  collectLabelRanges,
  collectElementIds,
  isWithinLabel,
  hasAriaLabel,
  hasValidAriaLabelledBy,
  hasTitle,
  hasLabelForId,
  hasTextContent
};
