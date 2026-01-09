const blockMacroRegex = /<@(?<name>[\w.-]+)\b(?<attrs>[^>]*)>(?<body>[\s\S]*?)<\/@(?<closeName>[\w.-]+)\s*>/gi;
const selfClosingMacroRegex = /<@(?<name>[\w.-]+)\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/>/gi;

const normalizeMacroName = (value) => String(value ?? "").trim().toLowerCase();

const collectFreemarkerMacros = (content) => {
  const macros = [];
  if (!content) {
    return macros;
  }

  for (const match of content.matchAll(blockMacroRegex)) {
    const { name, closeName, attrs, body } = match.groups;
    if (normalizeMacroName(name) !== normalizeMacroName(closeName)) {
      continue;
    }
    macros.push({
      name,
      attrs,
      body,
      index: match.index,
      raw: match[0]
    });
  }

  for (const match of content.matchAll(selfClosingMacroRegex)) {
    const { name, attrs } = match.groups;
    macros.push({
      name,
      attrs,
      body: "",
      index: match.index,
      raw: match[0]
    });
  }

  return macros;
};

const macroNameMatches = (name, candidates = []) => {
  const normalizedName = normalizeMacroName(name);
  if (!normalizedName) {
    return false;
  }
  const alias = normalizedName.split(".").pop();
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeMacroName(candidate);
    return normalizedCandidate === normalizedName || normalizedCandidate === alias;
  });
};

module.exports = {
  collectFreemarkerMacros,
  macroNameMatches,
  normalizeMacroName
};
