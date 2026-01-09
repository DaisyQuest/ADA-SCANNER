(() => {
  const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";

  const normalizeServerUrl = (value) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) {
      return { url: DEFAULT_SERVER_URL, warning: "Using default listener URL." };
    }

    try {
      const parsed = new URL(trimmed);
      if (!parsed.protocol || !parsed.host) {
        return { url: null, error: "Enter a full URL (http://host/path)." };
      }
      return { url: parsed.toString(), warning: null };
    } catch {
      return { url: null, error: "Listener URL is not valid." };
    }
  };

  const readStorage = (storageApi, defaults) =>
    new Promise((resolve) => {
      const maybePromise = storageApi.get(defaults, (result) => resolve(result));
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.then(resolve);
      }
    });

  const createPopup = ({ documentRoot, chromeApi }) => {
    const enabledToggle = documentRoot.getElementById("enabled-toggle");
    const spiderToggle = documentRoot.getElementById("spider-toggle");
    const serverUrlInput = documentRoot.getElementById("server-url");
    const statusText = documentRoot.getElementById("status-text");
    const serverStatus = documentRoot.getElementById("server-status");

    const setStatus = (enabled, spiderEnabled) => {
      const parts = [enabled ? "Forwarding enabled" : "Forwarding disabled"];
      if (spiderEnabled) {
        parts.push("Spider mode running");
      }
      statusText.textContent = parts.join(" · ");
      statusText.classList.toggle("disabled", !enabled);
    };

    /* istanbul ignore next */
    const setServerHint = (message, isError = false) => {
      serverStatus.textContent = message ?? "";
      serverStatus.classList.toggle("error", isError);
    };

    const applyState = (state) => {
      enabledToggle.checked = !!state.enabled;
      spiderToggle.checked = !!state.spiderEnabled;
      serverUrlInput.value = state.serverUrl ?? DEFAULT_SERVER_URL;
      setStatus(!!state.enabled, !!state.spiderEnabled);
    };

    const updateEnabled = async (enabled) => {
      await chromeApi.storage.local.set({ enabled });
      chromeApi.runtime.sendMessage({ type: "set-enabled", enabled });
      setStatus(enabled, spiderToggle.checked);
    };

    const updateSpider = async (enabled) => {
      await chromeApi.storage.local.set({ spiderEnabled: enabled });
      chromeApi.runtime.sendMessage({ type: "set-spider", enabled });
      setStatus(enabledToggle.checked, enabled);
    };

    const updateServerUrl = async (value) => {
      const result = normalizeServerUrl(value);
      if (result.error) {
        setServerHint(result.error, true);
        return;
      }

      await chromeApi.storage.local.set({ serverUrl: result.url });
      chromeApi.runtime.sendMessage({ type: "set-server-url", serverUrl: result.url });
      setServerHint(result.warning ?? "", false);
    };

    enabledToggle.addEventListener("change", (event) => {
      updateEnabled(event.target.checked);
    });

    spiderToggle.addEventListener("change", (event) => {
      updateSpider(event.target.checked);
    });

    serverUrlInput.addEventListener("change", (event) => {
      updateServerUrl(event.target.value);
    });

    chromeApi.storage.onChanged?.addListener((changes) => {
      if (changes.enabled || changes.spiderEnabled || changes.serverUrl) {
        readStorage(chromeApi.storage.local, {
          enabled: false,
          spiderEnabled: false,
          serverUrl: DEFAULT_SERVER_URL
        }).then(applyState);
      }
    });

    readStorage(chromeApi.storage.local, {
      enabled: false,
      spiderEnabled: false,
      serverUrl: DEFAULT_SERVER_URL
    }).then(applyState);

    return {
      updateEnabled,
      updateSpider,
      updateServerUrl,
      applyState,
      setServerHint
    };
  };

  /* istanbul ignore next */
  if (typeof module !== "undefined") {
    module.exports = { createPopup, normalizeServerUrl };
  }

  if (typeof chrome === "undefined") {
    return;
  }

  createPopup({ documentRoot: document, chromeApi: chrome });
})();
