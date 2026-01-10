(() => {
  const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";
  const DEFAULT_SPIDER_REQUEST_DELAY_MS = 0;

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

  const normalizeSpiderDelayMs = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return DEFAULT_SPIDER_REQUEST_DELAY_MS;
    }
    return Math.round(parsed);
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
    const sidebarToggle = documentRoot.getElementById("sidebar-toggle");
    const spiderToggle = documentRoot.getElementById("spider-toggle");
    const spiderDelayInput = documentRoot.getElementById("spider-delay");
    const serverUrlInput = documentRoot.getElementById("server-url");
    const statusText = documentRoot.getElementById("status-text");
    const serverStatus = documentRoot.getElementById("server-status");

    const setStatus = (enabled, spiderEnabled) => {
      const base = enabled ? "Forwarding on" : "Forwarding off";
      const suffix = spiderEnabled ? " • Spider on" : "";
      statusText.textContent = `${base}${suffix}`;
      statusText.classList.toggle("active", enabled);
      statusText.classList.toggle("disabled", !enabled);
    };

    /* istanbul ignore next */
    const setServerHint = (message, isError = false) => {
      serverStatus.textContent = message ?? "";
      serverStatus.classList.toggle("error", isError);
    };

    const applyState = (state) => {
      enabledToggle.checked = !!state.enabled;
      sidebarToggle.checked = !!state.sidebarEnabled;
      spiderToggle.checked = !!state.spiderEnabled;
      spiderDelayInput.value = state.spiderRequestDelayMs ?? DEFAULT_SPIDER_REQUEST_DELAY_MS;
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

    const updateSidebar = async (enabled) => {
      await chromeApi.storage.local.set({ sidebarEnabled: enabled });
    };

    const updateSpiderDelay = async (value) => {
      const spiderRequestDelayMs = normalizeSpiderDelayMs(value);
      await chromeApi.storage.local.set({ spiderRequestDelayMs });
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

    sidebarToggle.addEventListener("change", (event) => {
      updateSidebar(event.target.checked);
    });

    spiderToggle.addEventListener("change", (event) => {
      updateSpider(event.target.checked);
    });

    spiderDelayInput.addEventListener("change", (event) => {
      updateSpiderDelay(event.target.value);
    });

    serverUrlInput.addEventListener("change", (event) => {
      updateServerUrl(event.target.value);
    });

    chromeApi.storage.onChanged?.addListener((changes) => {
      if (
        changes.enabled ||
        changes.sidebarEnabled ||
        changes.spiderEnabled ||
        changes.serverUrl ||
        changes.spiderRequestDelayMs
      ) {
        readStorage(chromeApi.storage.local, {
          enabled: false,
          sidebarEnabled: true,
          spiderEnabled: false,
          serverUrl: DEFAULT_SERVER_URL,
          spiderRequestDelayMs: DEFAULT_SPIDER_REQUEST_DELAY_MS
        }).then(applyState);
      }
    });

    readStorage(chromeApi.storage.local, {
      enabled: false,
      sidebarEnabled: true,
      spiderEnabled: false,
      serverUrl: DEFAULT_SERVER_URL,
      spiderRequestDelayMs: DEFAULT_SPIDER_REQUEST_DELAY_MS
    }).then(applyState);

    return {
      updateEnabled,
      updateSidebar,
      updateSpider,
      updateSpiderDelay,
      updateServerUrl,
      applyState,
      setServerHint
    };
  };

  /* istanbul ignore next */
  if (typeof module !== "undefined") {
    module.exports = { createPopup, normalizeServerUrl, normalizeSpiderDelayMs };
  }

  if (typeof chrome === "undefined") {
    return;
  }

  createPopup({ documentRoot: document, chromeApi: chrome });
})();
