const { createForwarder, getDefaultConfig } = require("./forwarder");

const createContentScript = ({ chromeApi, documentRoot, windowObj, fetchFn }) => {
  let observer = null;

  const getConfig = async () => {
    const config = await getDefaultConfig(chromeApi.storage.local);
    return { serverUrl: config.serverUrl };
  };

  const forwarder = createForwarder({
    fetchFn,
    documentRoot,
    location: windowObj.location,
    getConfig
  });

  const start = () => {
    if (observer) {
      return;
    }

    observer = new windowObj.MutationObserver(() => {
      forwarder.schedule();
    });
    observer.observe(documentRoot.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true
    });
    forwarder.send();
  };

  const stop = () => {
    if (!observer) {
      return;
    }

    observer.disconnect();
    observer = null;
  };

  const handleToggle = (enabled) => {
    if (enabled) {
      start();
    } else {
      stop();
    }
  };

  chromeApi.runtime.onMessage.addListener((message) => {
    if (message?.type === "toggle") {
      handleToggle(message.enabled);
    }
  });

  chromeApi.storage.local.get({ enabled: false }, (state) => {
    handleToggle(state.enabled);
  });

  return { start, stop, handleToggle, getObserver: () => observer };
};

if (typeof chrome !== "undefined" && typeof document !== "undefined" && typeof window !== "undefined") {
  createContentScript({
    chromeApi: chrome,
    documentRoot: document,
    windowObj: window,
    fetchFn: window.fetch.bind(window)
  });
}

if (typeof module !== "undefined") {
  module.exports = { createContentScript };
}
