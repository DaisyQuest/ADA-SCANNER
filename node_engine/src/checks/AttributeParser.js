const attributeRegex = /(?<name>[a-zA-Z0-9:.-]+)\s*=\s*"(?<value>[^"]*)"/g;

const getAttributeValue = (attributes, name) => {
  if (!attributes || !name) {
    return null;
  }

  for (const match of attributes.matchAll(attributeRegex)) {
    if (match.groups?.name?.toLowerCase() === name.toLowerCase()) {
      return match.groups.value;
    }
  }

  return null;
};

module.exports = { getAttributeValue };
