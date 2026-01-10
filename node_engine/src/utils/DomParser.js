const { JSDOM } = require("jsdom");

const createDomDocument = ({ content, url } = {}) => {
  const resolvedUrl = url ? new URL(url, "http://localhost/").toString() : "http://localhost/";
  const dom = new JSDOM(content ?? "", {
    url: resolvedUrl,
    contentType: "text/html"
  });
  return dom.window.document;
};

module.exports = { createDomDocument };
