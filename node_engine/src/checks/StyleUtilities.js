const fixedLengthRegex = /^(?<value>-?\d+(?:\.\d+)?)(?<unit>px|pt|pc|cm|mm|in|em|rem)$/i;

const getLastPropertyValue = (style, propertyName) => {
  if (!style || !propertyName) {
    return null;
  }

  let value = null;
  const segments = style.split(";").map((segment) => segment.trim()).filter(Boolean);
  for (const segment of segments) {
    const separatorIndex = segment.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = segment.slice(0, separatorIndex).trim();
    if (name.toLowerCase() !== propertyName.toLowerCase()) {
      continue;
    }

    const propertyValue = segment.slice(separatorIndex + 1).trim();
    if (propertyValue) {
      value = propertyValue;
    }
  }

  return value;
};

const isFixedLength = (value) => {
  if (!value || !value.trim()) {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed.toLowerCase() === "auto") {
    return false;
  }

  if (trimmed.endsWith("%")) {
    return false;
  }

  const match = fixedLengthRegex.exec(trimmed);
  if (!match) {
    return false;
  }

  const number = Number.parseFloat(match.groups.value);
  if (Number.isNaN(number)) {
    return false;
  }

  return number > 0;
};

module.exports = { getLastPropertyValue, isFixedLength };
