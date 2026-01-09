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
const {
  registerBackground,
  toggleExtension,
  setEnabledState,
  setSpiderState,
  updateBadge,
  getActiveTab,
  runSpider,
  waitForTabComplete,
  captureSpiderTab
} = require("../extension/background");
const { createContentScript } = require("../extension/contentScript");
const { createPopup, normalizeServerUrl } = require("../extension/popup");

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

    const fallbackDoc = {
      documentElement: {
        cloneNode: () => ({
          outerHTML: null,
          querySelector: () => null,
          querySelectorAll: () => []
        })
      }
    };
    expect(normalizeHtml(fallbackDoc)).toBe("");

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

  test("forces send even when content is unchanged", async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
    const getConfig = jest.fn().mockResolvedValue({ serverUrl: DEFAULT_SERVER_URL });

    document.body.innerHTML = "<div>Stable</div>";
    const forwarder = createForwarder({
      fetchFn,
      documentRoot: document,
      location: window.location,
      getConfig
    });

    await forwarder.send();
    await forwarder.send({ force: true });
    expect(fetchFn).toHaveBeenCalledTimes(2);
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
    const listeners = { clicked: [], installed: [], activated: [], message: [] };
    return {
      action: {
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
        onClicked: {
          addListener: jest.fn((listener) => listeners.clicked.push(listener))
        }
      },
      runtime: {
        onInstalled: { addListener: jest.fn((listener) => listeners.installed.push(listener)) },
        onMessage: { addListener: jest.fn((listener) => listeners.message.push(listener)) }
      },
      tabs: {
        sendMessage: jest.fn(),
        onActivated: { addListener: jest.fn((listener) => listeners.activated.push(listener)) },
        query: jest.fn(() => Promise.resolve([{ id: 1 }])),
        create: jest.fn(() => Promise.resolve({ id: 99 })),
        remove: jest.fn(() => Promise.resolve()),
        onUpdated: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
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

  test("updates spider state and cancels when disabled", async () => {
    const chromeApi = createChrome();
    await setSpiderState(chromeApi, true);
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: true });
    await setSpiderState(chromeApi, false);
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: false });
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
    expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  test("invokes background listeners", async () => {
    const chromeApi = createChrome();
    registerBackground(chromeApi);

    chromeApi.__listeners.clicked[0]({ id: 2 });
    chromeApi.__listeners.installed[0]();
    await chromeApi.__listeners.activated[0]({ tabId: 2 });

    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({
      enabled: false,
      spiderEnabled: false,
      serverUrl: DEFAULT_SERVER_URL
    });
  });

  test("handles runtime messages for state updates", async () => {
    const chromeApi = createChrome();
    registerBackground(chromeApi);

    await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-enabled", enabled: true }, { tab: { id: 2 } }, resolve);
    });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: true });

    await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-server-url", serverUrl: "http://localhost:9999" }, null, resolve);
    });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ serverUrl: "http://localhost:9999" });
  });

  test("returns error payload when server url update fails", async () => {
    const chromeApi = createChrome();
    chromeApi.storage.local.set = jest.fn(() => Promise.reject(new Error("bad set")));
    registerBackground(chromeApi);

    const response = await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-server-url", serverUrl: "http://broken" }, null, resolve);
    });

    expect(response.ok).toBe(false);
    expect(response.error).toBe("bad set");
  });

  test("returns error payload when spider setup fails", async () => {
    const chromeApi = createChrome();
    chromeApi.storage.local.set = jest.fn(() => Promise.reject(new Error("fail")));
    registerBackground(chromeApi);

    const response = await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-spider", enabled: true }, null, resolve);
    });

    expect(response.ok).toBe(false);
    expect(response.error).toBe("fail");
  });

  test("handles spider disable message without starting run", async () => {
    const chromeApi = createChrome();
    registerBackground(chromeApi);
    const response = await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-spider", enabled: false }, null, resolve);
    });
    expect(response.ok).toBe(true);
    expect(chromeApi.tabs.create).not.toHaveBeenCalled();
  });

  test("starts spider when enabled via message", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn().mockResolvedValueOnce({ links: [] });
    registerBackground(chromeApi);
    const response = await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-spider", enabled: true }, { tab: { id: 7 } }, resolve);
    });
    expect(response.ok).toBe(true);
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledWith(7, { type: "spider-collect" });
  });

  test("returns true for spider message handlers", () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn().mockResolvedValueOnce({ links: [] });
    registerBackground(chromeApi);
    const result = chromeApi.__listeners.message[0]({ type: "set-spider", enabled: true }, { tab: { id: 3 } }, jest.fn());
    expect(result).toBe(true);
  });

  test("updates storage when spider message is received", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn().mockResolvedValueOnce({ links: [] });
    registerBackground(chromeApi);
    await new Promise((resolve) => {
      chromeApi.__listeners.message[0]({ type: "set-spider", enabled: true }, { tab: { id: 9 } }, resolve);
    });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: true });
  });

  test("handles missing active tab when spider runs", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.query = jest.fn(() => Promise.resolve([]));
    await runSpider(chromeApi);
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: false });
  });

  test("returns null when active tab query is unavailable", async () => {
    const tab = await getActiveTab({});
    expect(tab).toBeNull();
  });

  test("skips spider capture when collection fails", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn(() => Promise.reject(new Error("nope")));
    await runSpider(chromeApi, 1);
    expect(chromeApi.tabs.create).not.toHaveBeenCalled();
  });

  test("skips spider capture when tab creation lacks id", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn()
      .mockResolvedValueOnce({ links: ["http://example.com/a"] })
      .mockResolvedValue({ ok: true });
    chromeApi.tabs.create = jest.fn(() => Promise.resolve({}));
    await runSpider(chromeApi, 1);
    expect(chromeApi.tabs.remove).not.toHaveBeenCalled();
  });

  test("treats non-array spider responses as empty", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn().mockResolvedValueOnce({ links: "not-an-array" });
    await runSpider(chromeApi, 1);
    expect(chromeApi.tabs.create).not.toHaveBeenCalled();
  });

  test("avoids duplicate spider runs when already running", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn().mockResolvedValue({ links: [] });
    const first = runSpider(chromeApi, 1);
    const second = runSpider(chromeApi, 1);
    await first;
    await second;
    expect(chromeApi.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });

  test("cancels spider processing when disabled mid-run", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest.fn()
      .mockResolvedValueOnce({ links: ["http://example.com/a", "http://example.com/b"] })
      .mockResolvedValue({ ok: true });
    chromeApi.tabs.onUpdated.addListener.mockImplementation((listener) => {
      listener(99, { status: "complete" });
    });
    chromeApi.tabs.create = jest.fn(() => {
      setSpiderState(chromeApi, false);
      return Promise.resolve({ id: 99 });
    });

    await runSpider(chromeApi, 1);
    expect(chromeApi.tabs.create).toHaveBeenCalledTimes(1);
  });

  test("auto-registers background when chrome global is present", () => {
    jest.resetModules();
    global.chrome = {
      action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), onClicked: { addListener: jest.fn() } },
      runtime: { onInstalled: { addListener: jest.fn() }, onMessage: { addListener: jest.fn() } },
      tabs: {
        onActivated: { addListener: jest.fn() },
        onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
        sendMessage: jest.fn(),
        query: jest.fn(() => Promise.resolve([{ id: 1 }])),
        create: jest.fn(() => Promise.resolve({ id: 2 })),
        remove: jest.fn(() => Promise.resolve())
      },
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

  test("runs spider and captures tabs", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage = jest
      .fn()
      .mockResolvedValueOnce({ links: ["http://example.com/a", "http://example.com/b"] })
      .mockResolvedValue({ ok: true });
    chromeApi.tabs.onUpdated.addListener.mockImplementation((listener) => {
      listener(99, { status: "complete" });
    });

    await runSpider(chromeApi, 1);

    expect(chromeApi.tabs.create).toHaveBeenCalledTimes(2);
    expect(chromeApi.tabs.remove).toHaveBeenCalledTimes(2);
  });

  test("waits for tab completion with timeout handling", async () => {
    jest.useFakeTimers();
    const chromeApi = createChrome();
    const promise = waitForTabComplete(chromeApi, 2, 5).catch((error) => error.message);
    jest.runAllTimers();
    await expect(promise).resolves.toBe("Spider tab load timed out.");
    jest.useRealTimers();
  });

  test("resolves waitForTabComplete when status matches", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.onUpdated.addListener.mockImplementation((listener) => {
      listener(4, { status: "loading" });
      listener(5, { status: "loading" });
      listener(5, { status: "complete" });
    });
    await expect(waitForTabComplete(chromeApi, 5, 50)).resolves.toBeUndefined();
  });

  test("captures spider tab and handles send errors", async () => {
    jest.useFakeTimers();
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage.mockRejectedValueOnce(new Error("no script"));
    chromeApi.tabs.onUpdated.addListener.mockImplementation((listener) => {
      setTimeout(() => listener(3, { status: "complete" }), 1);
    });

    const promise = captureSpiderTab(chromeApi, 3);
    jest.runAllTimers();
    await promise;
    expect(chromeApi.tabs.remove).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("captures spider tab and ignores close errors", async () => {
    const chromeApi = createChrome();
    chromeApi.tabs.sendMessage.mockResolvedValueOnce({ ok: true });
    chromeApi.tabs.remove.mockRejectedValueOnce(new Error("close fail"));
    chromeApi.tabs.onUpdated.addListener.mockImplementation((listener) => {
      listener(3, { status: "complete" });
    });

    const result = await captureSpiderTab(chromeApi, 3);
    expect(result.ok).toBe(true);
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

  test("reapplies highlights after mutations when issues are cached", () => {
    jest.useFakeTimers();
    jest.resetModules();
    const applyHighlights = jest.fn();
    const observers = [];
    const originalObserver = window.MutationObserver;
    let onReport = null;

    window.MutationObserver = jest.fn(function (callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      this.trigger = callback;
      observers.push(this);
    });

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights, clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    globalThis.AdaForwarder = {
      createForwarder: jest.fn((options) => {
        onReport = options.onReport;
        return { schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) };
      }),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };

    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };

    const { createContentScript: reloadedCreateContentScript } = require("../extension/contentScript");
    const script = reloadedCreateContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });
    script.start();

    onReport({ issues: [{ selector: "#save", message: "Issue" }] });
    observers[0].trigger([]);
    observers[0].trigger([]);
    jest.runOnlyPendingTimers();

    expect(applyHighlights).toHaveBeenCalledTimes(2);
    window.MutationObserver = originalObserver;
    jest.useRealTimers();
  });

  test("skips refresh when no cached issues exist", () => {
    jest.useFakeTimers();
    jest.resetModules();
    const applyHighlights = jest.fn();
    const observers = [];
    const originalObserver = window.MutationObserver;

    window.MutationObserver = jest.fn(function (callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      this.trigger = callback;
      observers.push(this);
    });

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights, clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };
    globalThis.AdaForwarder = {
      createForwarder: jest.fn(() => ({ schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) })),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };

    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };

    const { createContentScript: reloadedCreateContentScript } = require("../extension/contentScript");
    const script = reloadedCreateContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });
    script.start();

    observers[0].trigger([]);
    jest.runOnlyPendingTimers();

    expect(applyHighlights).not.toHaveBeenCalled();
    window.MutationObserver = originalObserver;
    jest.useRealTimers();
  });

  test("collects visible links for spider mode", () => {
    document.body.innerHTML = "<a id=\"good\" href=\"/good\">Link</a><a id=\"hash\" href=\"#hash\">Hash</a>";
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    const good = document.getElementById("good");
    good.getBoundingClientRect = () => ({ width: 10, height: 10, top: 0, bottom: 10, left: 0, right: 10 });
    const hash = document.getElementById("hash");
    hash.getBoundingClientRect = () => ({ width: 10, height: 10, top: 0, bottom: 10, left: 0, right: 10 });

    const script = createContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });

    const links = script.collectVisibleLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toContain("/good");
  });

  test("skips hidden or non-http links during spider collection", () => {
    document.body.innerHTML = "\n      <a id=\"hidden\" href=\"/hidden\" style=\"display:none\">Hidden</a>\n      <a id=\"mailto\" href=\"mailto:test@example.com\">Email</a>\n      <a id=\"empty\" href=\"\">Empty</a>\n      <a id=\"invalid\" href=\"http://[invalid\">Bad</a>\n      <a id=\"visible\" href=\"https://example.com/page\">Visible</a>\n    ";
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    document.getElementById("hidden").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });
    document.getElementById("mailto").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });
    document.getElementById("empty").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });
    document.getElementById("invalid").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });
    document.getElementById("visible").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });

    const script = createContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });

    const links = script.collectVisibleLinks();
    expect(links).toEqual(["https://example.com/page"]);
  });

  test("responds to spider-collect messages", async () => {
    const messageListeners = [];
    document.body.innerHTML = "<a id=\"link\" href=\"/page\">Link</a>";
    const chromeApi = {
      runtime: { onMessage: { addListener: (listener) => messageListeners.push(listener) } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    document.getElementById("link").getBoundingClientRect = () => ({
      width: 10,
      height: 10,
      top: 0,
      bottom: 10,
      left: 0,
      right: 10
    });

    createContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });

    const response = await new Promise((resolve) => {
      messageListeners[0]({ type: "spider-collect" }, null, resolve);
    });
    expect(response.links).toHaveLength(1);
  });

  test("reports errors when spider collection fails", async () => {
    const messageListeners = [];
    const chromeApi = {
      runtime: { onMessage: { addListener: (listener) => messageListeners.push(listener) } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    const docRoot = {
      querySelectorAll: () => {
        throw new Error("fail");
      }
    };

    createContentScript({
      chromeApi,
      documentRoot: docRoot,
      windowObj: window,
      fetchFn: jest.fn()
    });

    const response = await new Promise((resolve) => {
      messageListeners[0]({ type: "spider-collect" }, null, resolve);
    });

    expect(response.error).toBe("fail");
  });

  test("deduplicates visible links and ignores zero-size elements", () => {
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    const docRoot = {
      querySelectorAll: () => [
        null,
        { getAttribute: () => "/dup", getBoundingClientRect: () => ({ width: 10, height: 10, top: 0, bottom: 10, left: 0, right: 10 }) },
        { getAttribute: () => "/dup", getBoundingClientRect: () => ({ width: 10, height: 10, top: 0, bottom: 10, left: 0, right: 10 }) },
        { getAttribute: () => "/zero", getBoundingClientRect: () => ({ width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0 }) }
      ]
    };

    const script = createContentScript({
      chromeApi,
      documentRoot: docRoot,
      windowObj: {
        location: window.location,
        innerWidth: 1024,
        innerHeight: 768,
        getComputedStyle: () => ({ display: "block", visibility: "visible" })
      },
      fetchFn: jest.fn()
    });

    const links = script.collectVisibleLinks();
    expect(links).toHaveLength(1);
  });

  test("captures once when spider capture message arrives", async () => {
    const messageListeners = [];
    const fetchFn = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({}) });
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

    createContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn
    });

    const response = await new Promise((resolve) => {
      messageListeners[0]({ type: "spider-capture" }, null, resolve);
    });
    expect(response.ok).toBe(true);
  });

  test("reports errors when spider capture fails", async () => {
    const messageListeners = [];
    const fetchFn = jest.fn().mockRejectedValue(new Error("fetch failed"));
    const chromeApi = {
      runtime: {
        onMessage: { addListener: (listener) => messageListeners.push(listener) }
      },
      storage: {
        local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) }
      }
    };

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights: jest.fn(), clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn((issues) => issues ?? [])
    };

    createContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn
    });

    const response = await new Promise((resolve) => {
      messageListeners[0]({ type: "spider-capture" }, null, resolve);
    });
    expect(response.ok).toBe(false);
  });

  test("drops cached issues when payload is not an array", () => {
    jest.useFakeTimers();
    jest.resetModules();
    const applyHighlights = jest.fn();
    const observers = [];
    const originalObserver = window.MutationObserver;
    let onReport = null;

    window.MutationObserver = jest.fn(function (callback) {
      this.observe = jest.fn();
      this.disconnect = jest.fn();
      this.trigger = callback;
      observers.push(this);
    });

    globalThis.AdaHighlighter = {
      createHighlighter: jest.fn(() => ({ applyHighlights, clearHighlights: jest.fn() })),
      filterIssuesForPage: jest.fn(() => null)
    };
    globalThis.AdaForwarder = {
      createForwarder: jest.fn((options) => {
        onReport = options.onReport;
        return { schedule: jest.fn(), send: jest.fn(() => Promise.resolve()) };
      }),
      getDefaultConfig: jest.fn(() => Promise.resolve({ serverUrl: DEFAULT_SERVER_URL }))
    };

    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };

    const { createContentScript: reloadedCreateContentScript } = require("../extension/contentScript");
    const script = reloadedCreateContentScript({
      chromeApi,
      documentRoot: document,
      windowObj: window,
      fetchFn: jest.fn()
    });
    script.start();

    onReport({ issues: [{ message: "Issue" }] });
    observers[0].trigger([]);
    jest.runOnlyPendingTimers();

    expect(applyHighlights).toHaveBeenCalledTimes(1);
    window.MutationObserver = originalObserver;
    jest.useRealTimers();
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

describe("Extension popup", () => {
  const createChromeApi = () => {
    const state = { enabled: false, spiderEnabled: false, serverUrl: DEFAULT_SERVER_URL };
    return {
      runtime: { sendMessage: jest.fn() },
      storage: {
        local: {
          get: jest.fn((defaults, callback) => callback({ ...defaults, ...state })),
          set: jest.fn((values) => Object.assign(state, values))
        },
        onChanged: { addListener: jest.fn() }
      }
    };
  };

  test("normalizes server urls", () => {
    expect(normalizeServerUrl("").url).toBe(DEFAULT_SERVER_URL);
    expect(normalizeServerUrl("notaurl").error).toBeTruthy();
    expect(normalizeServerUrl("http://localhost:1234").url).toBe("http://localhost:1234/");
    expect(normalizeServerUrl("file:///tmp").error).toBe("Enter a full URL (http://host/path).");
    expect(normalizeServerUrl(null).url).toBe(DEFAULT_SERVER_URL);
  });

  test("updates toggles and server url", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    const popup = createPopup({ documentRoot: document, chromeApi });

    await popup.updateEnabled(true);
    await popup.updateSpider(true);
    await popup.updateServerUrl("http://localhost:9999/capture");

    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: true });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ serverUrl: "http://localhost:9999/capture" });
    expect(chromeApi.runtime.sendMessage).toHaveBeenCalled();
  });

  test("responds to popup change events", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    createPopup({ documentRoot: document, chromeApi });

    const enabledToggle = document.getElementById("enabled-toggle");
    enabledToggle.checked = true;
    enabledToggle.dispatchEvent(new Event("change"));

    const spiderToggle = document.getElementById("spider-toggle");
    spiderToggle.checked = true;
    spiderToggle.dispatchEvent(new Event("change"));

    const serverUrl = document.getElementById("server-url");
    serverUrl.value = "http://localhost:7777/capture";
    serverUrl.dispatchEvent(new Event("change"));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ enabled: true });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ spiderEnabled: true });
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ serverUrl: "http://localhost:7777/capture" });
  });

  test("rejects invalid server urls", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    const popup = createPopup({ documentRoot: document, chromeApi });
    await popup.updateServerUrl("bad url");
    expect(chromeApi.storage.local.set).not.toHaveBeenCalledWith({ serverUrl: "bad url" });
    expect(document.getElementById("server-status").textContent).toBe("Listener URL is not valid.");
  });

  test("uses default server url when blank and shows warning", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    const popup = createPopup({ documentRoot: document, chromeApi });
    await popup.updateServerUrl(" ");
    expect(chromeApi.storage.local.set).toHaveBeenCalledWith({ serverUrl: DEFAULT_SERVER_URL });
    expect(document.getElementById("server-status").textContent).toContain("Using default");
  });

  test("applies state defaults and error hints", () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    const popup = createPopup({ documentRoot: document, chromeApi });

    popup.applyState({ enabled: true, spiderEnabled: true });
    popup.setServerHint("Bad URL", true);
    expect(document.getElementById("server-status").classList.contains("error")).toBe(true);
    popup.setServerHint(null, false);

    expect(document.getElementById("server-url").value).toBe(DEFAULT_SERVER_URL);
    expect(document.getElementById("status-text").textContent).toContain("Spider mode running");
    expect(document.getElementById("server-status").classList.contains("error")).toBe(false);
  });

  test("applies disabled state and clears status", () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    const popup = createPopup({ documentRoot: document, chromeApi });

    popup.applyState({ enabled: false, spiderEnabled: false, serverUrl: null });

    expect(document.getElementById("status-text").textContent).toContain("Forwarding disabled");
    expect(document.getElementById("server-url").value).toBe(DEFAULT_SERVER_URL);
  });

  test("ignores unrelated storage changes", () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    let listener = null;
    chromeApi.storage.onChanged.addListener.mockImplementation((cb) => {
      listener = cb;
    });
    const getSpy = chromeApi.storage.local.get;
    createPopup({ documentRoot: document, chromeApi });
    const initialCalls = getSpy.mock.calls.length;

    listener({ other: { newValue: true } });
    expect(getSpy.mock.calls.length).toBe(initialCalls);
  });

  test("refreshes state when storage changes", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    let listener = null;
    chromeApi.storage.onChanged.addListener.mockImplementation((cb) => {
      listener = cb;
    });
    createPopup({ documentRoot: document, chromeApi });

    chromeApi.storage.local.set({ enabled: true, spiderEnabled: true, serverUrl: "http://updated" });
    listener({ enabled: { newValue: true } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.getElementById("enabled-toggle").checked).toBe(true);
  });

  test("reads storage when get returns a promise", async () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    chromeApi.storage.local.get = jest.fn(() => Promise.resolve({ enabled: true, spiderEnabled: true, serverUrl: "http://example" }));
    createPopup({ documentRoot: document, chromeApi });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.getElementById("spider-toggle").checked).toBe(true);
  });

  test("auto-bootstraps when chrome is available", () => {
    jest.resetModules();
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    global.chrome = {
      runtime: { sendMessage: jest.fn() },
      storage: {
        local: { get: jest.fn((defaults, callback) => callback(defaults)), set: jest.fn() },
        onChanged: { addListener: jest.fn() }
      }
    };

    jest.isolateModules(() => {
      require("../extension/popup");
    });

    delete global.chrome;
  });

  test("skips storage change wiring when onChanged is missing", () => {
    document.body.innerHTML = "\n      <input id=\"enabled-toggle\" type=\"checkbox\" />\n      <input id=\"spider-toggle\" type=\"checkbox\" />\n      <input id=\"server-url\" type=\"text\" />\n      <div id=\"status-text\"></div>\n      <div id=\"server-status\"></div>\n    ";
    const chromeApi = createChromeApi();
    delete chromeApi.storage.onChanged;
    expect(() => createPopup({ documentRoot: document, chromeApi })).not.toThrow();
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
