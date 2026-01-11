/** @jest-environment jsdom */

const setupDom = () => {
  document.body.innerHTML = `
    <input id="rulesetIdInput" />
    <input id="rulesetLabelInput" />
    <textarea id="rulesetDescriptionInput"></textarea>
    <input id="rulesetSearchInput" />
    <div id="rulesetCatalog"></div>
    <div id="rulesetMatchCount"></div>
    <div id="rulesetTotalCount"></div>
    <div id="rulesetSelectedCount"></div>
    <div id="rulesetTeamCount"></div>
    <div id="rulesetCheckCount"></div>
    <pre id="rulesetJsonOutput"></pre>
    <button id="selectAllRules"></button>
    <button id="clearAllRules"></button>
    <button id="copyRulesetJson">Copy JSON</button>
    <button id="downloadRulesetJson">Download JSON</button>
  `;
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("Ruleset builder UI", () => {
  const originalFetch = global.fetch;
  const originalClipboard = global.navigator?.clipboard;
  const originalCreateObjectURL = global.URL?.createObjectURL;
  const originalRevokeObjectURL = global.URL?.revokeObjectURL;
  const originalAnchorClick = global.HTMLAnchorElement?.prototype.click;

  beforeEach(() => {
    setupDom();
    jest.resetModules();
    global.URL.createObjectURL = jest.fn(() => "blob:ruleset");
    global.URL.revokeObjectURL = jest.fn();
    if (global.HTMLAnchorElement?.prototype) {
      global.HTMLAnchorElement.prototype.click = jest.fn();
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalClipboard) {
      global.navigator.clipboard = originalClipboard;
    } else if (global.navigator?.clipboard) {
      delete global.navigator.clipboard;
    }
    if (originalCreateObjectURL) {
      global.URL.createObjectURL = originalCreateObjectURL;
    }
    if (originalRevokeObjectURL) {
      global.URL.revokeObjectURL = originalRevokeObjectURL;
    }
    if (originalAnchorClick && global.HTMLAnchorElement?.prototype) {
      global.HTMLAnchorElement.prototype.click = originalAnchorClick;
    }
  });

  test("renders catalog and updates selection summary", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rules: [
          {
            ruleId: "rule-1",
            description: "Requires label",
            teamName: "team",
            severity: "high",
            checkId: "missing-label",
            appliesTo: "html",
            problemTags: ["forms"]
          },
          {
            ruleId: "rule-2",
            description: "Requires alt",
            teamName: "media",
            severity: "low",
            checkId: "missing-alt",
            appliesTo: null,
            problemTags: "images"
          }
        ]
      })
    });
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const catalog = document.getElementById("rulesetCatalog");
    expect(catalog.innerHTML).toContain("rule-1");
    expect(catalog.innerHTML).toContain("rule-2");

    const checkbox = catalog.querySelector("input[data-rule-id='rule-1']");
    delete checkbox.dataset.ruleId;
    checkbox.dispatchEvent(new Event("change"));
    expect(document.getElementById("rulesetSelectedCount").textContent).toBe("0");

    checkbox.dataset.ruleId = "rule-1";
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    expect(document.getElementById("rulesetSelectedCount").textContent).toBe("1");
    expect(document.getElementById("rulesetTeamCount").textContent).toBe("1");
    expect(document.getElementById("rulesetCheckCount").textContent).toBe("1");

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    expect(document.getElementById("rulesetSelectedCount").textContent).toBe("0");

    document.getElementById("rulesetSearchInput").value = "alt";
    document.getElementById("rulesetSearchInput").dispatchEvent(new Event("input"));
    expect(document.getElementById("rulesetMatchCount").textContent).toBe("1");

    const descriptionInput = document.getElementById("rulesetDescriptionInput");
    descriptionInput.value = "Focused rules";
    descriptionInput.dispatchEvent(new Event("input"));
    const payload = JSON.parse(document.getElementById("rulesetJsonOutput").textContent);
    expect(payload.description).toBe("Focused rules");
  });

  test("copies JSON successfully", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });
    global.navigator.clipboard = { writeText: jest.fn().mockResolvedValue() };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const copyButton = document.getElementById("copyRulesetJson");
    copyButton.dispatchEvent(new Event("click"));
    await flushPromises();

    expect(copyButton.textContent).toBe("Copied!");
    jest.runOnlyPendingTimers();
    expect(copyButton.textContent).toBe("Copy JSON");
    jest.useRealTimers();
  });

  test("selects and clears visible rules", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rules: [
          { ruleId: "rule-1", description: "", teamName: "team", checkId: "missing-label", appliesTo: "html" }
        ]
      })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    document.getElementById("selectAllRules").click();
    expect(document.getElementById("rulesetSelectedCount").textContent).toBe("1");

    document.getElementById("clearAllRules").click();
    expect(document.getElementById("rulesetSelectedCount").textContent).toBe("0");

    const payload = JSON.parse(document.getElementById("rulesetJsonOutput").textContent);
    expect(payload.description).toBeUndefined();
  });

  test("copies JSON and handles clipboard failure", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });
    global.navigator.clipboard = { writeText: jest.fn().mockRejectedValue(new Error("no")) };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const copyButton = document.getElementById("copyRulesetJson");
    copyButton.dispatchEvent(new Event("click"));
    await flushPromises();

    expect(copyButton.textContent).toBe("Copy failed");
    jest.runOnlyPendingTimers();
    expect(copyButton.textContent).toBe("Copy JSON");
    jest.useRealTimers();
  });

  test("downloads JSON and handles missing catalog", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    document.getElementById("downloadRulesetJson").dispatchEvent(new Event("click"));
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    global.fetch = jest.fn().mockRejectedValue(new Error("fail"));
    jest.resetModules();
    setupDom();
    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    expect(document.getElementById("rulesetCatalog").innerHTML).toContain("Unable to load rules catalog");
  });

  test("shows error when catalog response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    expect(document.getElementById("rulesetCatalog").innerHTML).toContain("Unable to load rules catalog");
  });

  test("handles non-array rules payloads", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: "bad" })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    expect(document.getElementById("rulesetTotalCount").textContent).toBe("0");
  });

  test("renders fallback labels for missing rule metadata", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rules: [
          { ruleId: "rule-3", description: "", teamName: null, checkId: "", appliesTo: null }
        ]
      })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const catalog = document.getElementById("rulesetCatalog");
    expect(catalog.innerHTML).toContain("Unknown");
    expect(catalog.innerHTML).toContain("Check");
    expect(catalog.innerHTML).toContain("Applies to: Any");
  });

  test("uses ruleset id as label when label is empty", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    document.getElementById("rulesetIdInput").value = "ONLY_ID";
    document.getElementById("rulesetIdInput").dispatchEvent(new Event("input"));
    const payload = JSON.parse(document.getElementById("rulesetJsonOutput").textContent);
    expect(payload.label).toBe("ONLY_ID");
  });

  test("fires copy and download handlers", async () => {
    const writeText = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });
    global.navigator.clipboard = { writeText };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const searchInput = document.getElementById("rulesetSearchInput");
    searchInput.value = "query";
    searchInput.dispatchEvent(new Event("input"));

    document.getElementById("copyRulesetJson").dispatchEvent(new Event("click"));
    await flushPromises();
    expect(writeText).toHaveBeenCalled();

    document.getElementById("downloadRulesetJson").dispatchEvent(new Event("click"));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  test("copies explicit payload content", async () => {
    const writeText = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });
    global.navigator.clipboard = { writeText };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const output = document.getElementById("rulesetJsonOutput");
    output.textContent = "custom-payload";

    document.getElementById("copyRulesetJson").dispatchEvent(new Event("click"));
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("custom-payload");
  });

  test("falls back to empty payloads when output is blank", async () => {
    jest.useFakeTimers();
    const writeText = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });
    global.navigator.clipboard = { writeText };

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const output = document.getElementById("rulesetJsonOutput");
    output.textContent = "";

    document.getElementById("copyRulesetJson").dispatchEvent(new Event("click"));
    await flushPromises();

    expect(writeText).toHaveBeenCalledWith("");
    jest.runOnlyPendingTimers();

    output.textContent = "";
    document.getElementById("downloadRulesetJson").dispatchEvent(new Event("click"));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("defaults empty search value to show all rules", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rules: [
          { ruleId: "rule-1", description: "a", teamName: "team", checkId: "one", appliesTo: "html" }
        ]
      })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const searchInput = document.getElementById("rulesetSearchInput");
    Object.defineProperty(searchInput, "value", { value: undefined, configurable: true });
    searchInput.dispatchEvent(new Event("input"));

    expect(document.getElementById("rulesetMatchCount").textContent).toBe("1");
  });

  test("groups multiple rules under the same team", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        rules: [
          { ruleId: "rule-1", description: "a", teamName: "shared", checkId: "one", appliesTo: "html" },
          { ruleId: "rule-2", description: "b", teamName: "shared", checkId: "two", appliesTo: "html" }
        ]
      })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const catalog = document.getElementById("rulesetCatalog");
    expect(catalog.innerHTML).toContain("shared");
    expect(catalog.innerHTML).toContain("2 rules");
  });

  test("handles missing optional inputs without crashing", async () => {
    document.body.innerHTML = `
      <input id="rulesetIdInput" />
      <textarea id="rulesetDescriptionInput"></textarea>
      <div id="rulesetCatalog"></div>
      <div id="rulesetMatchCount"></div>
      <div id="rulesetTotalCount"></div>
      <div id="rulesetSelectedCount"></div>
      <div id="rulesetTeamCount"></div>
      <div id="rulesetCheckCount"></div>
      <pre id="rulesetJsonOutput"></pre>
    `;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ rules: [] })
    });

    require("../src/listener/ui/assets/rulesets");
    await flushPromises();

    const payload = JSON.parse(document.getElementById("rulesetJsonOutput").textContent);
    expect(payload.id).toBe("CUSTOM_RULESET");
  });
});
