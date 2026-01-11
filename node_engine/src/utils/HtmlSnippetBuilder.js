const { renderFreemarkerTemplate } = require("./FreemarkerRenderer");

const LANGUAGE_HINTS = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  cshtml: "text/html",
  ftl: "text/html"
};
const HTML_KINDS = new Set(["html", "htm", "cshtml"]);

const normalizeKind = (kind) => String(kind ?? "html").toLowerCase();
const normalizeContent = (content) => String(content ?? "");

const ensureHtmlDocument = (content = "") => {
  const normalized = normalizeContent(content);
  if (/<\s*html\b/i.test(normalized)) {
    return normalized;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${normalized}</body></html>`;
};

const buildHtmlSnippetResult = ({ html, kind, sourceKind, contentType }) => ({
  html,
  kind,
  sourceKind,
  contentType
});

const buildHtmlWrappedSnippet = ({ normalizedKind, normalizedContent }) =>
  buildHtmlSnippetResult({
    html: ensureHtmlDocument(normalizedContent),
    kind: normalizedKind,
    sourceKind: normalizedKind === "html" || normalizedKind === "htm" ? "html" : normalizedKind,
    contentType: LANGUAGE_HINTS[normalizedKind]
  });

const buildFreemarkerSnippet = ({ normalizedContent }) =>
  buildHtmlSnippetResult({
    html: ensureHtmlDocument(renderFreemarkerTemplate(normalizedContent)),
    kind: "html",
    sourceKind: "ftl",
    contentType: "text/html"
  });

const buildCssSnippet = ({ normalizedContent }) =>
  buildHtmlSnippetResult({
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${normalizedContent}</style></head><body></body></html>`,
    kind: "css",
    sourceKind: "css",
    contentType: "text/html"
  });

const buildJsSnippet = ({ normalizedContent }) =>
  buildHtmlSnippetResult({
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><script>${normalizedContent}</script></body></html>`,
    kind: "js",
    sourceKind: "js",
    contentType: "text/html"
  });

const buildFallbackSnippet = ({ normalizedKind, normalizedContent }) =>
  buildHtmlSnippetResult({
    html: ensureHtmlDocument(normalizedContent),
    kind: "html",
    sourceKind: normalizedKind,
    contentType: LANGUAGE_HINTS[normalizedKind] || "text/html"
  });

const buildHtmlSnippet = ({ content = "", kind = "html" } = {}) => {
  const normalizedKind = normalizeKind(kind);
  const normalizedContent = normalizeContent(content);

  if (HTML_KINDS.has(normalizedKind)) {
    return buildHtmlWrappedSnippet({ normalizedKind, normalizedContent });
  }

  if (normalizedKind === "ftl") {
    return buildFreemarkerSnippet({ normalizedContent });
  }

  if (normalizedKind === "css") {
    return buildCssSnippet({ normalizedContent });
  }

  if (normalizedKind === "js") {
    return buildJsSnippet({ normalizedContent });
  }

  return buildFallbackSnippet({ normalizedKind, normalizedContent });
};

module.exports = { buildHtmlSnippet };
