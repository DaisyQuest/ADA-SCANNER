const { renderFreemarkerTemplate, preserveNewlines } = require("../src/utils/FreemarkerRenderer");

describe("FreemarkerRenderer", () => {
  test("renders macros and interpolations", () => {
    const content = "<@card title=\"x\">Hello ${name}</@card><@icon />\n<#--comment-->";
    const rendered = renderFreemarkerTemplate(content);

    expect(rendered).toContain("data-freemarker-macro=\"card\"");
    expect(rendered).toContain("Hello freemarker</span>");
    expect(rendered).toContain("data-freemarker-macro=\"icon\"");
    expect(rendered).not.toContain("<#--comment-->");
  });

  test("preserves newline positions when stripping directives", () => {
    const content = "Line 1\n<#if test>\nLine 2\n</#if>\n[#--note--]\nLine 3";
    const rendered = renderFreemarkerTemplate(content);

    const originalNewlines = content.split("\n").length;
    const renderedNewlines = rendered.split("\n").length;
    expect(renderedNewlines).toBe(originalNewlines);
    expect(rendered).toContain("Line 1");
    expect(rendered).toContain("Line 2");
    expect(rendered).toContain("Line 3");
  });

  test("strips freemarker comments while preserving line count", () => {
    const content = "Line 1\n<#--comment-->\nLine 2\n[#--note--]\nLine 3";
    const rendered = renderFreemarkerTemplate(content);

    expect(rendered.split("\n").length).toBe(content.split("\n").length);
    expect(rendered).not.toContain("#--comment--");
    expect(rendered).not.toContain("#--note--");
    expect(rendered).toContain("Line 1");
    expect(rendered).toContain("Line 2");
    expect(rendered).toContain("Line 3");
  });

  test("returns empty string when content is missing", () => {
    expect(renderFreemarkerTemplate()).toBe("");
    expect(renderFreemarkerTemplate(null)).toBe("");
  });

  test("preserves newlines for null and string inputs", () => {
    expect(preserveNewlines()).toBe("");
    expect(preserveNewlines("a\nb")).toBe(" \n ");
  });
});
