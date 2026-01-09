const { createDomDocument } = require("../src/utils/DomParser");

describe("DomParser", () => {
  test("creates a document from content", () => {
    const document = createDomDocument({ content: "<html><body><h1>Hi</h1></body></html>", url: "http://example" });
    expect(document.querySelector("h1").textContent).toBe("Hi");
    expect(document.location.href).toBe("http://example/");
  });

  test("defaults content and url when missing", () => {
    const document = createDomDocument();
    expect(document.documentElement.tagName.toLowerCase()).toBe("html");
    expect(document.location.href).toBe("http://localhost/");
  });
});
