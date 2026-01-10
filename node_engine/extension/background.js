const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";
const DEFAULT_MAX_SPIDER_PAGES = 10;
const DEFAULT_SPIDER_REQUEST_DELAY_MS = 0;

const defaultState = {
  enabled: false,
  sidebarEnabled: true,
  tabOrderEnabled: false,
  spiderEnabled: false,
  serverUrl: DEFAULT_SERVER_URL,
  spiderRequestDelayMs: DEFAULT_SPIDER_REQUEST_DELAY_MS
};

const spiderState = {
  running: false,
  cancelRequested: false
};

const updateBadge = (chromeApi, enabled, tabId) => {
  const text = enabled ? "ON" : "OFF";
  chromeApi.action.setBadgeText({ text, tabId });
  chromeApi.action.setBadgeBackgroundColor({
    color: enabled ? "#0F9D58" : "#9E9E9E",
    tabId
  });
};

const setEnabledState = async (chromeApi, enabled, tabId) => {
  await chromeApi.storage.local.set({ enabled });
  updateBadge(chromeApi, enabled, tabId);

  if (tabId != null) {
    try {
      await chromeApi.tabs.sendMessage(tabId, { type: "toggle", enabled });
    } catch {
      // Tab may not have a content script on it; ignore.
    }
  }
};

const setSpiderState = async (chromeApi, enabled) => {
  await chromeApi.storage.local.set({ spiderEnabled: enabled });
  if (!enabled) {
    spiderState.cancelRequested = true;
  }
};

const normalizeSpiderDelayMs = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_SPIDER_REQUEST_DELAY_MS;
  }
  return Math.round(parsed);
};

const wait = (delayMs) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

const toggleExtension = async (chromeApi, tab) => {
  const current = await chromeApi.storage.local.get(defaultState);

  const next = !current.enabled;
  await setEnabledState(chromeApi, next, tab?.id);
};

const getActiveTab = async (chromeApi) => {
  if (!chromeApi?.tabs?.query) {
    return null;
  }

  const tabs = await chromeApi.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] ?? null;
};

const collectSpiderLinks = async (chromeApi, tabId) => {
  try {
    return await chromeApi.tabs.sendMessage(tabId, { type: "spider-collect" });
  } catch (error) {
    console.warn("[ADA] spider collect failed", error);
    return { links: [] };
  }
};

const waitForTabComplete = (chromeApi, tabId, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    let timeout = null;
    const listener = (updatedTabId, info) => {
      if (updatedTabId !== tabId) {
        return;
      }

      if (info.status === "complete") {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      chromeApi.tabs.onUpdated.removeListener(listener);
    };

    chromeApi.tabs.onUpdated.addListener(listener);
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Spider tab load timed out."));
    }, timeoutMs);
  });

const captureSpiderTab = async (chromeApi, tabId) => {
  try {
    await waitForTabComplete(chromeApi, tabId);
    return await chromeApi.tabs.sendMessage(tabId, { type: "spider-capture" });
  } catch (error) {
    console.warn("[ADA] spider capture failed", error);
    return { ok: false, error: error.message };
  } finally {
    try {
      await chromeApi.tabs.remove(tabId);
    } catch (error) {
      console.warn("[ADA] unable to close spider tab", error);
    }
  }
};

const runSpider = async (chromeApi, startTabId) => {
  if (spiderState.running) {
    return;
  }

  spiderState.running = true;
  spiderState.cancelRequested = false;

  try {
    const config = await chromeApi.storage.local.get({
      spiderRequestDelayMs: DEFAULT_SPIDER_REQUEST_DELAY_MS
    });
    const requestDelayMs = normalizeSpiderDelayMs(config.spiderRequestDelayMs);

    const tabId = startTabId ?? (await getActiveTab(chromeApi))?.id;
    if (!tabId) {
      await setSpiderState(chromeApi, false);
      return;
    }

    const response = await collectSpiderLinks(chromeApi, tabId);
    const links = Array.isArray(response?.links) ? response.links : [];
    const uniqueLinks = Array.from(new Set(links)).slice(0, DEFAULT_MAX_SPIDER_PAGES);

    for (let index = 0; index < uniqueLinks.length; index += 1) {
      const link = uniqueLinks[index];
      if (spiderState.cancelRequested) {
        break;
      }

      const tab = await chromeApi.tabs.create({ url: link, active: false });
      if (!tab?.id) {
        continue;
      }

      await captureSpiderTab(chromeApi, tab.id);
      if (!spiderState.cancelRequested && requestDelayMs > 0 && index < uniqueLinks.length - 1) {
        await wait(requestDelayMs);
      }
    }
  } finally {
    spiderState.running = false;
    spiderState.cancelRequested = false;
  }
};

const registerBackground = (chromeApi) => {
  chromeApi.action.onClicked.addListener((tab) => {
    toggleExtension(chromeApi, tab);
  });

  chromeApi.runtime.onInstalled.addListener(() => {
    chromeApi.storage.local.set(defaultState);
  });

  chromeApi.tabs.onActivated.addListener(async (activeInfo) => {
    const state = await chromeApi.storage.local.get(defaultState);
    updateBadge(chromeApi, state.enabled, activeInfo.tabId);
  });

  chromeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "set-enabled") {
      const tabId = sender?.tab?.id;
      setEnabledState(chromeApi, !!message.enabled, tabId).then(() => sendResponse({ ok: true }));
      return true;
    }

    if (message?.type === "set-server-url") {
      Promise.resolve(chromeApi.storage.local.set({ serverUrl: message.serverUrl }))
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    /* istanbul ignore next */
    if (message?.type === "set-spider") {
      const enabled = !!message.enabled;
      setSpiderState(chromeApi, enabled)
        .then(() => (enabled ? runSpider(chromeApi, sender?.tab?.id) : null))
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
  });
};

if (typeof chrome !== "undefined" && chrome?.action) {
  registerBackground(chrome);
}

/* istanbul ignore next */
if (typeof module !== "undefined") {
  module.exports = {
    registerBackground,
    toggleExtension,
    setEnabledState,
    setSpiderState,
    updateBadge,
    getActiveTab,
    runSpider,
    waitForTabComplete,
    captureSpiderTab,
    DEFAULT_SERVER_URL,
    DEFAULT_MAX_SPIDER_PAGES,
    DEFAULT_SPIDER_REQUEST_DELAY_MS,
    normalizeSpiderDelayMs,
    wait
  };
}
