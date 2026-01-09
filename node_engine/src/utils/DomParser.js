const { JSDOM } = require("jsdom");

const createDomDocument = ({ content, url } = {}) => {
  const dom = new JSDOM(content ?? "", {
    url: url || "http://localhost",
    contentType: "text/html"
  });
  return dom.window.document;
};

module.exports = { createDomDocument };
