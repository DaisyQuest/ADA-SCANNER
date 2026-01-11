const preserveNewlines = (value = "") => String(value).replace(/[^\n]/g, " ");

const replaceWithNewlines = (content, patterns) =>
  patterns.reduce((output, pattern) => output.replace(pattern, (match) => preserveNewlines(match)), content);

const replaceInterpolations = (content) => content.replace(/\$\{[^}]*\}/g, "freemarker");

const replaceMacros = (content) => {
  let output = content;
  output = output.replace(
    /<@(?<name>[\w.-]+)\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/>/gi,
    (_match, name) => `<span data-freemarker-macro="${name}"></span>`
  );
  output = output.replace(
    /<@(?<name>[\w.-]+)\b[^>]*>/gi,
    (_match, name) => `<span data-freemarker-macro="${name}">`
  );
  output = output.replace(/<\/@[\w.-]+\s*>/gi, "</span>");
  return output;
};

const renderFreemarkerTemplate = (content) => {
  if (!content) {
    return "";
  }

  const normalized = String(content);
  const withoutComments = replaceWithNewlines(normalized, [
    /<\#--[\s\S]*?-->/g,
    /\[#--[\s\S]*?--\]/g
  ]);
  const withInterpolations = replaceInterpolations(withoutComments);
  const withMacros = replaceMacros(withInterpolations);
  return replaceWithNewlines(withMacros, [
    /<\#[^>]*?>/gi,
    /<\/\#[^>]*?>/gi,
    /\[#(?:[^\]]*?)\]/g,
    /\[\/\#(?:[^\]]*?)\]/g
  ]);
};

module.exports = { renderFreemarkerTemplate, preserveNewlines };
