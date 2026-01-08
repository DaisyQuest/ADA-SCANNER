/** @jest-environment jsdom */

const {
  DEFAULT_SERVER_URL,
  normalizeHtml,
  createPayload,
  createHash,
  shouldForwardUpdate,
  createForwarder,
  getDefaultConfig
} = require("../extension/forwarder");
const { registerBackground, toggleExtension, setEnabledState, updateBadge } = require("../extension/background");
const { createContentScript } = require("../extension/contentScript");

describe("Extension forwarder utilities", () => {
  test("builds payloads and hashes", () => {
    document.body.innerHTML = "<div>Test</div>";
    const html = normalizeHtml(document);
    expect(html).toContain("<html>");
    expect(normalizeHtml(null)).toBe("");

    const payload = createPayload({ url: "http://example", html, title: "Title" });
    expect(payload).toEqual({
      url: "http://example",
      html,
      title: "Title",
      contentType: "text/html",
      kind: "html"
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
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
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

  test("does not resend identical HTML and clears scheduled timers", async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
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
});

describe("Extension content script", () => {
  test("starts and stops based on toggle", async () => {
    jest.useFakeTimers();
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
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

    const script = createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn });

    expect(script.getObserver()).toBeNull();
    messageListeners[0]({ type: "toggle", enabled: true });
    expect(script.getObserver()).not.toBeNull();
    script.start();
    observers[0].trigger([]);
    jest.runAllTimers();

    messageListeners[0]({ type: "toggle", enabled: false });
    expect(script.getObserver()).toBeNull();
    window.MutationObserver = originalObserver;
    jest.useRealTimers();
  });

  test("auto-starts when enabled in storage", () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    const chromeApi = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: true, serverUrl: DEFAULT_SERVER_URL }) } }
    };

    const script = createContentScript({ chromeApi, documentRoot: document, windowObj: window, fetchFn });
    expect(script.getObserver()).not.toBeNull();
    script.stop();
    expect(script.getObserver()).toBeNull();
  });

  test("auto-registers content script when chrome global is present", () => {
    jest.resetModules();
    global.chrome = {
      runtime: { onMessage: { addListener: jest.fn() } },
      storage: { local: { get: (defaults, callback) => callback({ enabled: false, serverUrl: DEFAULT_SERVER_URL }) } }
    };
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.window.fetch = mockFetch;
    require("../extension/contentScript");
    delete global.chrome;
  });
});
