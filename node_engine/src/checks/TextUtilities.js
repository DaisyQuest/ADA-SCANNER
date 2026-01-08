const getLineNumber = (content, index) => {
  if (index <= 0) {
    return 1;
  }

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

const containsAttribute = (attributes, attributeName, allowBoolean = false) => {
  if (!attributes || !attributeName) {
    return false;
  }

  if (!allowBoolean) {
    return attributes.toLowerCase().includes(`${attributeName.toLowerCase()}=`);
  }

  const pattern = new RegExp(`(^|\\s)${attributeName.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(\\s|=|$)`, "i");
  return pattern.test(attributes);
};

module.exports = { getLineNumber, containsAttribute };
