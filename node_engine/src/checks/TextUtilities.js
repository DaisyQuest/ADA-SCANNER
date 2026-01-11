const countLinesToIndex = (content, index) => {
  let line = 1;
  for (let i = 0; i < content.length && i < index; i += 1) {
    if (content[i] === "\n") {
      line += 1;
    }
  }
  if (index < content.length && content[index] === "\n") {
    line += 1;
  }
  return line;
};

const getLineNumber = (content, index) => {
  if (index <= 0) {
    return 1;
  }

  const normalizedContent = content ?? "";
  return countLinesToIndex(normalizedContent, index);
};

const getLineNumberForSnippet = (content, snippet, fallbackIndex = 0) => {
  if (!content) {
    return 1;
  }

  const index = snippet ? content.indexOf(snippet) : -1;
  if (index >= 0) {
    return getLineNumber(content, index);
  }

  return getLineNumber(content, fallbackIndex);
};

const containsAttribute = (attributes, attributeName, allowBoolean = false) => {
  if (!attributes || !attributeName) {
    return false;
  }

  if (!allowBoolean) {
    return attributes.toLowerCase().includes(`${attributeName.toLowerCase()}=`);
  }

  const escaped = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escaped}(\\s|=|$)`, "i");
  return pattern.test(attributes);
};

module.exports = { getLineNumber, getLineNumberForSnippet, containsAttribute };
