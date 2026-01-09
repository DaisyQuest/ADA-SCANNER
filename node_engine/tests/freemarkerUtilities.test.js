const { collectFreemarkerMacros, macroNameMatches, normalizeMacroName } = require("../src/checks/FreemarkerUtilities");

describe("FreemarkerUtilities", () => {
  test("collects block and self-closing macros", () => {
    const content = `
      <@ui.card title="Hello">Body</@ui.card>
      <@button label="Save" />
    `;
    const macros = collectFreemarkerMacros(content);
    expect(macros).toHaveLength(2);
    expect(macros[0].name).toBe("ui.card");
    expect(macros[0].body.trim()).toBe("Body");
    expect(macros[1].name).toBe("button");
  });

  test("normalizes and matches macro names", () => {
    expect(normalizeMacroName(" Ui.Card ")).toBe("ui.card");
    expect(normalizeMacroName(null)).toBe("");
    expect(normalizeMacroName(undefined)).toBe("");
    expect(macroNameMatches("ui.iframe", ["iframe"])).toBe(true);
    expect(macroNameMatches("ui.button", ["ui.button"])).toBe(true);
    expect(macroNameMatches("button", ["input"])).toBe(false);
    expect(macroNameMatches("", ["iframe"])).toBe(false);
    expect(macroNameMatches("button")).toBe(false);
  });

  test("skips invalid macros and empty content", () => {
    const macros = collectFreemarkerMacros("");
    expect(macros).toEqual([]);

    const mismatched = collectFreemarkerMacros("<@card>Body</@panel>");
    expect(mismatched).toEqual([]);

    const undefinedContent = collectFreemarkerMacros();
    expect(undefinedContent).toEqual([]);

    expect(macroNameMatches("button", [])).toBe(false);
  });
});
