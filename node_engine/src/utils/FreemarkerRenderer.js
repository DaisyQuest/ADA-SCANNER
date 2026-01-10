const preserveNewlines = (value = "") => String(value).replace(/[^\n]/g, " ");

const renderFreemarkerTemplate = (content) => {
  if (!content) {
    return "";
  }

  let output = String(content);

  output = output.replace(/<\#--[\s\S]*?-->/g, (match) => preserveNewlines(match));
  output = output.replace(/\[#--[\s\S]*?--\]/g, (match) => preserveNewlines(match));

  output = output.replace(/\$\{[^}]*\}/g, "freemarker");

  output = output.replace(
    /<@(?<name>[\w.-]+)\b(?<attrs>(?:[^>"']|"[^"]*"|'[^']*')*)\s*\/>/gi,
    (_match, name) => `<span data-freemarker-macro="${name}"></span>`
  );
  output = output.replace(
    /<@(?<name>[\w.-]+)\b[^>]*>/gi,
    (_match, name) => `<span data-freemarker-macro="${name}">`
  );
  output = output.replace(/<\/@[\w.-]+\s*>/gi, "</span>");

  output = output.replace(/<\#[^>]*?>/gi, (match) => preserveNewlines(match));
  output = output.replace(/<\/\#[^>]*?>/gi, (match) => preserveNewlines(match));
  output = output.replace(/\[#(?:[^\]]*?)\]/g, (match) => preserveNewlines(match));
  output = output.replace(/\[\/\#(?:[^\]]*?)\]/g, (match) => preserveNewlines(match));

  return output;
};

module.exports = { renderFreemarkerTemplate, preserveNewlines };
