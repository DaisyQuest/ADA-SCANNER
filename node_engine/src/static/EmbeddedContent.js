const HTML_SNIPPET_PATTERN = /<\s*[a-z][\w:-]*(\s|>|\/)/i;
const CSS_PROPERTY_PATTERN = /[a-z-]+\s*:\s*[^;]+;/i;
const CSS_RULE_PATTERN = /\{[^}]*\}/;

const isHtmlSnippet = (value) => HTML_SNIPPET_PATTERN.test(value);
const isCssSnippet = (value) => CSS_PROPERTY_PATTERN.test(value) || CSS_RULE_PATTERN.test(value);

const countNewlines = (content) => (content.match(/\n/g) || []).length;

const extractStringLiterals = (content) => {
  const results = [];
  let index = 0;

  while (index < content.length) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "/" && next === "/") {
      const endOfLine = content.indexOf("\n", index + 2);
      if (endOfLine === -1) {
        break;
      }
      index = endOfLine + 1;
      continue;
    }

    if (char === "/" && next === "*") {
      const endComment = content.indexOf("*/", index + 2);
      if (endComment === -1) {
        break;
      }
      index = endComment + 2;
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      const startIndex = index + 1;
      let value = "";
      index += 1;

      while (index < content.length) {
        const current = content[index];
        if (current === "\\") {
          value += current + (content[index + 1] ?? "");
          index += 2;
          continue;
        }
        if (current === quote) {
          index += 1;
          break;
        }
        value += current;
        index += 1;
      }

      results.push({ value, startIndex });
      continue;
    }

    if (char === "`") {
      const startIndex = index + 1;
      let value = "";
      index += 1;

      while (index < content.length) {
        const current = content[index];
        if (current === "\\") {
          value += current + (content[index + 1] ?? "");
          index += 2;
          continue;
        }
        if (current === "`") {
          index += 1;
          break;
        }
        if (current === "$" && content[index + 1] === "{") {
          index += 2;
          let depth = 1;
          while (index < content.length && depth > 0) {
            const expChar = content[index];
            if (expChar === "'" || expChar === '"' || expChar === "`") {
              const quote = expChar;
              index += 1;
              while (index < content.length) {
                const inner = content[index];
                if (inner === "\\") {
                  index += 2;
                  continue;
                }
                if (inner === quote) {
                  index += 1;
                  break;
                }
                if (inner === "\n") {
                  value += "\n";
                }
                index += 1;
              }
              continue;
            }
            if (expChar === "{") {
              depth += 1;
            } else if (expChar === "}") {
              depth -= 1;
            }
            if (expChar === "\n") {
              value += "\n";
            }
            index += 1;
          }
          continue;
        }
        value += current;
        index += 1;
      }

      results.push({ value, startIndex });
      continue;
    }

    index += 1;
  }

  return results;
};

const extractEmbeddedContent = (content) => {
  const snippets = [];

  for (const literal of extractStringLiterals(content)) {
    if (!literal.value) {
      continue;
    }

    if (isHtmlSnippet(literal.value)) {
      snippets.push({ kind: "html", content: literal.value, startIndex: literal.startIndex });
    }

    if (isCssSnippet(literal.value)) {
      snippets.push({ kind: "css", content: literal.value, startIndex: literal.startIndex });
    }
  }

  return snippets;
};

const buildPaddedContent = (content, startIndex, snippet) => {
  const lineOffset = countNewlines(content.slice(0, startIndex));
  return `${"\n".repeat(lineOffset)}${snippet}`;
};

module.exports = {
  extractEmbeddedContent,
  buildPaddedContent
};
