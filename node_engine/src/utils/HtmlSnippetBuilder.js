const { renderFreemarkerTemplate } = require("./FreemarkerRenderer");

const LANGUAGE_HINTS = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  cshtml: "text/html",
  ftl: "text/html"
};

const ensureHtmlDocument = (content = "") => {
  const normalized = String(content);
  if (/<\s*html\b/i.test(normalized)) {
    return normalized;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>${normalized}</body></html>`;
};

const buildHtmlSnippet = ({ content = "", kind = "html" } = {}) => {
  const normalizedKind = String(kind).toLowerCase();
  const normalizedContent = String(content);

  if (["html", "htm", "cshtml"].includes(normalizedKind)) {
    return {
      html: ensureHtmlDocument(normalizedContent),
      kind: normalizedKind,
      sourceKind: normalizedKind === "html" || normalizedKind === "htm" ? "html" : normalizedKind,
      contentType: LANGUAGE_HINTS[normalizedKind]
    };
  }

  if (normalizedKind === "ftl") {
    const rendered = renderFreemarkerTemplate(normalizedContent);
    return {
      html: ensureHtmlDocument(rendered),
      kind: "html",
      sourceKind: "ftl",
      contentType: "text/html"
    };
  }

  if (normalizedKind === "css") {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${normalizedContent}</style></head><body></body></html>`;
    return {
      html,
      kind: "css",
      sourceKind: "css",
      contentType: "text/html"
    };
  }

  if (normalizedKind === "js") {
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><script>${normalizedContent}</script></body></html>`;
    return {
      html,
      kind: "js",
      sourceKind: "js",
      contentType: "text/html"
    };
  }

  return {
    html: ensureHtmlDocument(normalizedContent),
    kind: "html",
    sourceKind: normalizedKind,
    contentType: LANGUAGE_HINTS[normalizedKind] || "text/html"
  };
};

module.exports = { buildHtmlSnippet };
