/** @jest-environment jsdom */

const { copyRulesetJson, downloadRulesetJson } = require("../src/listener/ui/assets/rulesetActions");

describe("rulesetActions", () => {
  test("copies ruleset payload and resets status", async () => {
    jest.useFakeTimers();
    const clipboard = { writeText: jest.fn().mockResolvedValue() };
    const onCopied = jest.fn();
    const onReset = jest.fn();

    await copyRulesetJson({
      payload: "payload",
      clipboard,
      onCopied,
      onReset,
      setTimeoutFn: setTimeout
    });

    expect(clipboard.writeText).toHaveBeenCalledWith("payload");
    expect(onCopied).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(onReset).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("handles clipboard failures", async () => {
    const onFailed = jest.fn();
    const onReset = jest.fn();

    await copyRulesetJson({
      payload: "payload",
      clipboard: null,
      onFailed,
      onReset,
      setTimeoutFn: (fn) => fn()
    });

    expect(onFailed).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });

  test("handles defaults without callbacks", async () => {
    jest.useFakeTimers();
    const clipboard = { writeText: jest.fn().mockResolvedValue() };

    await copyRulesetJson({
      payload: "payload",
      clipboard
    });

    expect(clipboard.writeText).toHaveBeenCalledWith("payload");
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("uses default parameters when none provided", async () => {
    jest.useFakeTimers();

    await copyRulesetJson();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("downloads ruleset json using provided APIs", () => {
    const urlApi = {
      createObjectURL: jest.fn(() => "blob:url"),
      revokeObjectURL: jest.fn()
    };
    const link = { click: jest.fn(), remove: jest.fn() };
    const documentRef = {
      body: { appendChild: jest.fn() },
      createElement: jest.fn(() => link)
    };

    downloadRulesetJson({
      payload: "payload",
      filename: "ruleset.json",
      documentRef,
      urlApi
    });

    expect(urlApi.createObjectURL).toHaveBeenCalled();
    expect(documentRef.createElement).toHaveBeenCalledWith("a");
    expect(link.click).toHaveBeenCalled();
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:url");
  });

  test("downloads ruleset json with default APIs", () => {
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalRevokeObjectURL = global.URL.revokeObjectURL;
    const originalAnchorClick = global.HTMLAnchorElement?.prototype.click;
    global.URL.createObjectURL = jest.fn(() => "blob:default");
    global.URL.revokeObjectURL = jest.fn();
    if (global.HTMLAnchorElement?.prototype) {
      global.HTMLAnchorElement.prototype.click = jest.fn();
    }

    downloadRulesetJson();

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:default");
    if (global.HTMLAnchorElement?.prototype) {
      expect(global.HTMLAnchorElement.prototype.click).toHaveBeenCalled();
      global.HTMLAnchorElement.prototype.click = originalAnchorClick;
    }

    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
