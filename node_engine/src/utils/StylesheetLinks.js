const path = require("path");
const { getAttributeValue } = require("../checks/AttributeParser");

const linkTagRegex = /<link(?<attrs>[^>]*?)>/gi;
const schemeRegex = /^[a-z][a-z0-9+.-]*:/i;

const stripQueryAndHash = (value) => {
  if (!value) {
    return value;
  }
  return value.split("#")[0].split("?")[0];
};

const isStylesheetRel = (rel) => {
  if (!rel) {
    return false;
  }
  return rel
    .split(/\s+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes("stylesheet");
};

const resolveStylesheetPath = ({ href, basePath }) => {
  if (!href || !basePath) {
    return null;
  }

  const trimmed = stripQueryAndHash(href.trim());
  if (!trimmed) {
    return null;
  }

  if (schemeRegex.test(trimmed) || trimmed.startsWith("//")) {
    return null;
  }

  const baseDir = path.posix.dirname(basePath);
  if (trimmed.startsWith("/")) {
    return path.posix.normalize(trimmed.slice(1));
  }

  return path.posix.normalize(path.posix.join(baseDir, trimmed));
};

const resolveStylesheetUrl = ({ href, baseUrl }) => {
  if (!href || !baseUrl) {
    return null;
  }

  const trimmed = stripQueryAndHash(href.trim());
  if (!trimmed) {
    return null;
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (!resolved.protocol || !["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }
    resolved.hash = "";
    return resolved.toString();
  } catch {
    return null;
  }
};

const extractStylesheetLinks = ({ content, basePath, baseUrl }) => {
  if (!content) {
    return [];
  }

  const links = new Set();
  for (const match of content.matchAll(linkTagRegex)) {
    const attrs = match.groups?.attrs ?? "";
    const rel = getAttributeValue(attrs, "rel");
    if (!isStylesheetRel(rel)) {
      continue;
    }

    const href = getAttributeValue(attrs, "href");
    const resolved = baseUrl
      ? resolveStylesheetUrl({ href, baseUrl })
      : resolveStylesheetPath({ href, basePath });

    if (resolved) {
      links.add(resolved);
    }
  }

  return Array.from(links);
};

module.exports = {
  extractStylesheetLinks,
  resolveStylesheetPath,
  resolveStylesheetUrl,
  stripQueryAndHash,
  isStylesheetRel
};
