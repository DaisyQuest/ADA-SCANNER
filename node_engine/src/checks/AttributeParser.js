const attributeRegex = /(?<name>[a-zA-Z0-9:.-]+)(?:\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<unquoted>[^\s"'=<>`]+)))?/g;

const getAttributeValue = (attributes, name) => {
  if (!attributes || !name) {
    return null;
  }

  for (const match of attributes.matchAll(attributeRegex)) {
    if (match.groups?.name?.toLowerCase() === name.toLowerCase()) {
      const value = match.groups.double ?? match.groups.single ?? match.groups.unquoted ?? null;
      if (value !== null) {
        return value;
      }
      return null;
    }
  }

  return null;
};

module.exports = { getAttributeValue };
