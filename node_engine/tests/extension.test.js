/** @jest-environment jsdom */

const {
  DEFAULT_SERVER_URL,
  normalizeHtml,
  stripHighlights,
  createPayload,
  createHash,
  shouldForwardUpdate,
  createForwarder,
  getDefaultConfig
} = require("../extension/forwarder");
const { createHighlighter, filterIssuesForPage } = require("../extension/highlighter");
const { registerBackground, toggleExtension, setEnabledState, updateBadge } = require("../extension/background");
const { createContentScript } = require("../extension/contentScript");

describe("Extension forwarder utilities", () => {
  test("builds payloads and hashes", () => {
    document.body.innerHTML = "<div>Test</div>";
    const html = normalizeHtml(document);
    expect(html).toContain("<html>");
    expect(normalizeHtml(null)).toBe("");

    document.head.innerHTML = '<style id="ada-highlight-style">.ada-highlight{}</style>';
    document.body.innerHTML = '<div class="ada-highlight" data-ada-issue-count="1" title="Issue">Hi</div>';
    const clone = document.documentElement.cloneNode(true);
    stripHighlights(clone);
    expect(clone.querySelector(".ada-highlight")).toBeNull();
    expect(clone.querySelector("#ada-highlight-style")).toBeNull();
    expect(clone.querySelector("[title]")).toBeNull();

    document.body.innerHTML = '<div class="ada-highlight" data-ada-original-title="Original" title="Issue">Hi</div>';
    const cloneWithTitle = document.documentElement.cloneNode(true);
    stripHighlights(cloneWithTitle);
    expect(cloneWithTitle.querySelector("[title]")?.getAttribute("title")).toBe("Original");

    expect(stripHighlights(null)).toBeUndefined();
    const strippedHtml = normalizeHtml(document);
    expect(strippedHtml).not.toContain("ada-highlight");

    const payload = createPayload({ url: "http://example", html, title: "Title" });
    expect(payload).toEqual({
      url: "http://example",
      html,
      title: "Title",
      contentType: "text/html",
      kind: "html",
      Url: "http://example",
      Html: html,
      Title: "Title",
      ContentType: "text/html",
      StatusCode: 200
    });

    const hashA = createHash("abc");
    const hashB = createHash("abc");
    expect(hashA).toBe(hashB);
    const result = shouldForwardUpdate(hashA, "abc");
    expect(result.shouldSend).toBe(false);
    expect(shouldForwardUpdate(hashA, "").shouldSend).toBe(false);
  });

  test("creates forwarder that posts updates", async () => {
    const calls = [];
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });

    document.body.innerHTML = "<div>Test</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig,
      debounceMs: 1
    });

    await forwarder.send();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    document.body.innerHTML = "<div>Changed</div>";
    forwarder.schedule();

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const call = fetchFn.mock.calls[0];
    calls.push(call[0]);
    expect(calls[0]).toBe(DEFAULT_SERVER_URL);
  });

  test("logs when capture fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("fail")
    });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });

    document.body.innerHTML = "<div>Test</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig,
      debounceMs: 1
    });

    await forwarder.send();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("does not resend identical HTML and clears scheduled timers", async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });

    document.body.innerHTML = "<div>Stable</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig,
      debounceMs: 10
    });

    await forwarder.send();
    await forwarder.send();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    forwarder.schedule();
    forwarder.schedule();
    jest.runAllTimers();
    await Promise.resolve();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test("reads default config", async () => {
    const storageApi = {
      get: (defaults, callback) => callback({ serverUrl: defaults.serverUrl })
    };

    const config = await getDefaultConfig(storageApi);
    expect(config.serverUrl).toBe(DEFAULT_SERVER_URL);
  });

  test("invokes onReport callback when response contains JSON", async () => {
    const report = { issues: [{ message: "Issue" }] };
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(report)
    });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });
    const onReport = jest.fn();

    document.body.innerHTML = "<div>Test</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig,
      onReport
    });

    await forwarder.send();
    expect(onReport).toHaveBeenCalledWith(report);
  });

  test("warns when capture response JSON parsing fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("bad json"))
    });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });

    document.body.innerHTML = "<div>Test</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig,
      onReport: jest.fn()
    });

    await forwarder.send();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("Extension background", () => {
  const createChrome = () => {
    const state = { enabled: false, serverUrl: DEFAULT_SERVER_URL };
    const listeners = { clicked: [], installed: [], activated: [] };
    return {
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        onClicked: {
          addListener: jest.fn((listener) => listeners.clicked.push(listener))
        }
      },
      runtime: {
        onInstalled: { addListener: jest.fn((listener) => listeners.installed.push(listener)) }
      },
      tabs: {
        sendMessage: jest.fn(),
        onActivated: { addListener: jest.fn((listener) => listeners.activated.push(listener)) }
      },
      storage: {
        local: {
          get: jest.fn((defaults) => Promise.resolve({ ...defaults, ...state })),
          set: jest.fn((values) => Object.assign(state, values))
        }
      },
      __listeners: listeners
    };
  };

  test("updates badge and toggles enabled state", async () => {
    const chromeApi = createChrome();

    updateBadge(chromeApi, true, 1);
    expect(chromeApi.action.setBadgeText).toHaveBeenCalledWith({ text: "ON", tabId: 1 });

    await setEnabledState(chromeApi, true, 1);
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledWith(1, { type: "toggle", enabled: true });

    await setEnabledState(chromeApi, false, null);
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(1);

    await toggleExtension(chromeApi, { id: 1 });
    expect(chromeApi.action.setBadgeText).toHaveBeenCalled();
  });

  test("ignores sendMessage failures when toggling", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage.mockRejectedValue(new Error("missing"));
    await setEnabledState(chromeApi, true, 5);
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledWith(5, { type: "toggle", enabled: true });
  });

  test("ignores tab messaging errors when toggling", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn(() => Promise.reject(new Error("no content script")));
    await setEnabledState(chromeApi, true, 1);
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: true });
  });

  test("registers background listeners", () => {
    const chromeApi = createChrome();
    registerBackground(chromeApi);
    expect(chromeApi.action.onClicked.addListener).toHaveBeenCalled();
    expect(chromeApi.runtime.onInstalled.addListener).toHaveBeenCalled();
    expect(chromeApi.tabs.onActivated.addListener).toHaveBeenCalled();
  });

  test("invokes background listeners", async () => {
    const chromeApi = createChrome();
    registerBackground(chromeApi);

    chromeApi.__listeners.clicked[0]({ id: 2 });
    chromeApi.__listeners.installed[0]();
    await chromeApi.__listeners.activated[0]({ tabId: 2 });

    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: false, serverUrl: DEFAULT_SERVER_URL });
  });

  test("auto-registers background when chrome global is present", () => {
    jest.resetModules();
    global.chrome = {
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), onClicked: { addListener: jest.fn() } },
      runtime: { onInstalled: { addListener: jest.fn() } },
      tabs: { onActivated: { addListener: jest.fn() }, sendMessage: jest.fn() },
      storage: { local: { set: jest.fn(), get: jest.fn(() => Promise.resolve({ enabled: false })) } }
    };
    require("../extension/background");
    delete global.chrome;
  });

  test("does not auto-register when chrome is missing", () => {
    jest.resetModules();
    delete global.chrome;
    expect(() => require("../extension/background")).not.toThrow();
  });
});

describe("Extension content script", () => {
  test("starts and stops based on toggle", async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    const messageListeners = [];
    const observers = [];
    const originalObserver = window.MutationObserver;
    window.MutationObserver = jest.fn(function (callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      this.trigger = callback;
      observers.push(this);
    });

    const chromeApi = {
      runtime: {
        onMessage: {
          addListener: (listener) => messageListeners.push(listener)
        }
      },
      storage: {
        local: {
          get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL })
        }
      }
    };

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    const script = createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn });

    expect(script.getObserver()).toBeNull();
    messageListeners[0]({ type: "toggle", enabled: true });
    expect(script.getObserver()).not.toBeNull();
    script.start();
    observers[0].trigger([]);
    jest.runAllTimers();

    messageListeners[0]({ type: "toggle", enabled: false });
    expect(script.getObserver()).toBeNull();
    script.stop();
    window.MutationObserver = originalObserver;
    jest.useRealTimers();
  });

  test("logs when initial send fails", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: true, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaForwarder = {
      createForwarder: jest.fn(() => ({
        schedule: jest.fn(),
        send: jest.fn(() => Promise.reject(new Error("fail")))
      })),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn: jest.fn() });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("ignores non-toggle messages", () => {
    const messageListeners = [];
    const chromeApi = {
      runtime: {
        onMessage: {
          addListener: (listener) => messageListeners.push(listener)
        }
      },
      storage: {
        local: {
          get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL })
        }
      }
    };

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    const script = createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn: jest.fn() });
    messageListeners[0]({ type: "noop" });
    expect(script.getObserver()).toBeNull();
  });

  test("auto-starts when enabled in storage", () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: true, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    const script = createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn });
    expect(script.getObserver()).not.toBeNull();
    script.stop();
    expect(script.getObserver()).toBeNull();
  });

  test("applies highlights when report payload arrives", () => {
    jest.resetModules();
    const applyHighlights = jest.fn();
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights, clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues)
    };
    globalThis.AdaForwarder = {
      createForwarder: jest.fn((options) => {
        options.onReport({ issues: [{ message: "Issue" }] });
        return { schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) };
      }),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };

    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };

    const { createContentScript: reloadedCreateContentScript } = require("../extension/contentScript");
    reloadedCreateContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn: jest.fn() });
    expect(applyHighlights).toHaveBeenCalledWith([{ message: "Issue" }]);
  });

  test("auto-registers content script when chrome global is present", () => {
    jest.resetModules();
    global.chrome = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.window.fetch = mockFetch;
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    require("../extension/contentScript");
    delete global.chrome;
  });

  test("exits early when forwarder is missing", () => {
    jest.resetModules();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    delete globalThis.AdaForwarder;
    delete globalThis.AdaHighlighter;

    jest.isolateModules(() => {
      require("../extension/contentScript");
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("exits early when highlighter is missing", () => {
    jest.resetModules();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    globalThis.AdaForwarder = {
      createForwarder: jest.fn(() => ({ schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) })),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };
    delete globalThis.AdaHighlighter;

    jest.isolateModules(() => {
      require("../extension/contentScript");
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("bootstraps when chrome is available", () => {
    jest.resetModules();
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    globalThis.AdaForwarder = {
      createForwarder: jest.fn(() => ({ schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) })),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    global.chrome = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: jest.fn((defaults, callback) => callback({ enabled: false })) } }
    };
    window.fetch = jest.fn(() => Promise.resolve({ ok: true }));

    jest.isolateModules(() => {
      require("../extension/contentScript");
    });

    expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(globalThis.AdaForwarder.createForwarder).toHaveBeenCalled();

    delete global.chrome;
    logSpy.mockRestore();
  });
});

describe("Extension highlighter", () => {
  test("applies and clears highlights using selectors", () => {
    document.body.innerHTML = "<button id=\"save\" title=\"Original\">Save</button>";
    const highlighter = createHighlighter({ documentRoot: document });

    highlighter.applyHighlights([{ selector: "#save", message: "Missing label" }]);
    const button = document.getElementById("save");
    expect(button.classList.contains("ada-highlight")).toBe(true);
    expect(button.getAttribute("data-ada-issue-count")).toBe("1");
    expect(button.getAttribute("title")).toContain("Missing label");

    highlighter.clearHighlights();
    expect(button.classList.contains("ada-highlight")).toBe(false);
    expect(button.getAttribute("title")).toBe("Original");
  });

  test("reuses existing highlight styles", () => {
    document.head.innerHTML = "<style id=\"ada-highlight-style\"></style>";
    document.body.innerHTML = "<button id=\"save\">Save</button>";
    const highlighter = createHighlighter({ documentRoot: document });
    highlighter.applyHighlights([{ selector: "#save", message: "Missing label" }]);
    expect(document.querySelectorAll("#ada-highlight-style")).toHaveLength(1);
  });

  test("applies highlights based on evidence and filters by page URL", () => {
    document.body.innerHTML = "<input id=\"email\" type=\"email\" />";
    const highlighter = createHighlighter({ documentRoot: document });
    const issues = [
      { evidence: "<input id=\"email\" type=\"email\" />", message: "Missing label", filePath: window.location.href },
      { message: "Other", filePath: "http://other" },
      { selector: "#email", message: "No file path issue" }
    ];

    const filtered = filterIssuesForPage(issues, window.location.href);
    expect(filtered).toHaveLength(2);
    highlighter.applyHighlights(filtered);

    const input = document.getElementById("email");
    expect(input.classList.contains("ada-highlight")).toBe(true);
  });

  test("handles invalid selectors, long evidence, and missing titles", () => {
    document.body.innerHTML = "<div class=\"card\"></div>";
    const highlighter = createHighlighter({ documentRoot: document });

    highlighter.applyHighlights([
      { selector: "div[", message: "Bad selector" },
      { evidence: "x".repeat(2500), message: "Too long" }
    ]);

    const card = document.querySelector(".card");
    expect(card.classList.contains("ada-highlight")).toBe(false);

    highlighter.applyHighlights([{ evidence: "<div class=\"card\"></div>", message: "Card issue" }]);
    expect(card.classList.contains("ada-highlight")).toBe(true);

    highlighter.clearHighlights();
    expect(card.hasAttribute("title")).toBe(false);
  });

  test("uses CSS.escape when available", () => {
    const originalCss = globalThis.CSS;
    globalThis.CSS = { escape: (value) => value };
    document.body.innerHTML = "<span id=\"status\"></span>";
    const highlighter = createHighlighter({ documentRoot: document });
    highlighter.applyHighlights([{ evidence: "<span id=\"status\"></span>", message: "Issue" }]);
    const target = document.getElementById("status");
    expect(target.classList.contains("ada-highlight")).toBe(true);
    globalThis.CSS = originalCss;
  });

  test("falls back when CSS.escape is unavailable and skips empty highlights", () => {
    const originalCss = globalThis.CSS;
    globalThis.CSS = undefined;
    document.body.innerHTML = "<span id=\"status:1\"></span>";
    const highlighter = createHighlighter({ documentRoot: document });

    highlighter.applyHighlights([]);
    const target = document.getElementById("status:1");
    expect(target.classList.contains("ada-highlight")).toBe(false);

    highlighter.applyHighlights([{ evidence: "<span id=\"status:1\"></span>", message: "Issue" }]);
    expect(target.classList.contains("ada-highlight")).toBe(true);
    globalThis.CSS = originalCss;
  });

  test("resolves evidence attributes and ignores non-html evidence", () => {
    document.body.innerHTML = `
      <a href="/home" aria-label="Home" role="link">Home</a>
      <input name="email" type="email" />
    `;
    const highlighter = createHighlighter({ documentRoot: document });

    const linkTargets = highlighter.resolveTargets(document, {
      evidence: "<a href=\"/home\" aria-label=\"Home\" role=\"link\">Home</a>"
    });
    const inputTargets = highlighter.resolveTargets(document, {
      evidence: "<input name=\"email\" type=\"email\" />"
    });
    const emptyTargets = highlighter.resolveTargets(document, { evidence: "plain text" });

    expect(linkTargets).toHaveLength(1);
    expect(inputTargets).toHaveLength(1);
    expect(emptyTargets).toHaveLength(0);
    expect(highlighter.resolveTargets(document, null)).toEqual([]);
  });

  test("returns empty targets for invalid or unmatched evidence", () => {
    document.body.innerHTML = "<div></div>";
    const highlighter = createHighlighter({ documentRoot: document });

    expect(highlighter.resolveTargets(document, { evidence: "<section></section>" })).toEqual([]);
    expect(highlighter.resolveTargets(document, { evidence: "<>" })).toEqual([]);
    expect(highlighter.resolveTargets(document, {})).toEqual([]);
  });
});
