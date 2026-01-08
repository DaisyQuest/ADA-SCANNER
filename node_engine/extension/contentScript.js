(() => {
  if (!globalThis.AdaForwarder) {
    console.error("[ADA] AdaForwarder not found. Is forwarder.js loaded first?");
    return;
  }

  const { createForwarder, getDefaultConfig } = globalThis.AdaForwarder;

  const createContentScript = ({ chromeApi, documentRoot, windowObj, fetchFn }) => {
    let observer = null;

    const getConfig = async () => {
      const config = await getDefaultConfig(chromeApi.storage.local);
      console.log("[ADA] config:", config);
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
        console.log("[ADA] already started");
        return;
      }

      console.log("[ADA] starting observer on", windowObj.location.href);

      observer = new windowObj.MutationObserver(() => {
        // schedule can be very chatty; keep log minimal
        forwarder.schedule();
      });

      observer.observe(documentRoot.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });

      // Force an immediate send on start and log failures
      Promise.resolve()
          .then(() => forwarder.send())
          .then(() => console.log("[ADA] initial send done"))
          .catch((e) => console.error("[ADA] initial send failed", e));
    };

    const stop = () => {
      if (!observer) {
        console.log("[ADA] already stopped");
        return;
      }
      observer.disconnect();
      observer = null;
      console.log("[ADA] stopped");
    };

    const handleToggle = (enabled) => {
      console.log("[ADA] toggle:", enabled);
      enabled ? start() : stop();
    };

    chromeApi.runtime.onMessage.addListener((message) => {
      if (message?.type === "toggle") {
        handleToggle(!!message.enabled);
      }
    });

    chromeApi.storage.local.get({ enabled: false }, (state) => {
      console.log("[ADA] initial enabled state:", state.enabled);
      handleToggle(!!state.enabled);
    });

    return { start, stop, handleToggle, getObserver: () => observer };
  };

  globalThis.createContentScript = createContentScript;

  if (typeof module !== "undefined") {
    module.exports = { createContentScript };
  }

  if (typeof chrome === "undefined") {
    console.error("[ADA] chrome API not available; skipping content script bootstrap.");
    return;
  }

  createContentScript({
    chromeApi: chrome,
    documentRoot: document,
    windowObj: window,
    fetchFn: window.fetch.bind(window)
  });

  console.log("[ADA] content script loaded");
})();
