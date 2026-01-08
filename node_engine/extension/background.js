const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";

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

const toggleExtension = async (chromeApi, tab) => {
  const current = await chromeApi.storage.local.get({
    enabled: false,
    serverUrl: DEFAULT_SERVER_URL
  });

  const next = !current.enabled;
  await setEnabledState(chromeApi, next, tab?.id);
};

const registerBackground = (chromeApi) => {
  chromeApi.action.onClicked.addListener((tab) => {
    toggleExtension(chromeApi, tab);
  });

  chromeApi.runtime.onInstalled.addListener(() => {
    chromeApi.storage.local.set({ enabled: false, serverUrl: DEFAULT_SERVER_URL });
  });

  chromeApi.tabs.onActivated.addListener(async (activeInfo) => {
    const state = await chromeApi.storage.local.get({ enabled: false });
    updateBadge(chromeApi, state.enabled, activeInfo.tabId);
  });
};

if (typeof chrome !== "undefined" && chrome?.action) {
  registerBackground(chrome);
}

if (typeof module !== "undefined") {
  module.exports = { registerBackground, toggleExtension, setEnabledState, updateBadge, DEFAULT_SERVER_URL };
}
