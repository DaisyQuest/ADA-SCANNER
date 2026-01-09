(() => {
  if (!globalThis.AdaForwarder) {
    console.error("[ADA] AdaForwarder not found. Is forwarder.js loaded first?");
    return;
  }

  if (!globalThis.AdaHighlighter) {
    console.error("[ADA] AdaHighlighter not found. Is highlighter.js loaded first?");
    return;
  }

  const { createForwarder, getDefaultConfig } = globalThis.AdaForwarder;
  const { createHighlighter, filterIssuesForPage } = globalThis.AdaHighlighter;

  const createContentScript = ({ chromeApi, documentRoot, windowObj, fetchFn }) => {
    let observer = null;
    let refreshTimeout = null;
    let lastIssues = [];
    const highlighter = createHighlighter({ documentRoot });

    const getConfig = async () => {
      const config = await getDefaultConfig(chromeApi.storage.local);
      console.log("[ADA] config:", config);
      return { serverUrl: config.serverUrl };
    };

    const clearRefreshTimeout = () => {
      if (refreshTimeout) {
        windowObj.clearTimeout(refreshTimeout);
        refreshTimeout = null;
      }
    };

    const scheduleRefresh = () => {
      if (!lastIssues.length) {
        return;
      }
      clearRefreshTimeout();
      refreshTimeout = windowObj.setTimeout(() => {
        refreshTimeout = null;
        highlighter.applyHighlights(lastIssues);
      }, 100);
    };

    const forwarder = createForwarder({
      fetchFn,
      documentRoot,
      location: windowObj.location,
      getConfig,
      onReport: (payload) => {
        const issues = filterIssuesForPage(payload?.issues, windowObj.location.href);
        lastIssues = Array.isArray(issues) ? issues : [];
        highlighter.applyHighlights(issues);
      }
    });

    const normalizeSpiderUrl = (href) => {
      if (!href || !href.trim()) {
        return null;
      }

      try {
        const url = new URL(href, windowObj.location.href);
        if (!["http:", "https:"].includes(url.protocol)) {
          return null;
        }
        url.hash = "";
        return url.toString();
      } catch {
        return null;
      }
    };

    const isElementVisible = (element) => {
      if (!element) {
        return false;
      }

      const style = windowObj.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return false;
      }

      return !(
        rect.bottom < 0 ||
        rect.top > windowObj.innerHeight ||
        rect.right < 0 ||
        rect.left > windowObj.innerWidth
      );
    };

    const collectVisibleLinks = () => {
      const links = [];
      const seen = new Set();
      const anchors = Array.from(documentRoot.querySelectorAll("a[href]"));
      for (const anchor of anchors) {
        if (!isElementVisible(anchor)) {
          continue;
        }

        const normalized = normalizeSpiderUrl(anchor.getAttribute("href"));
        if (!normalized) {
          continue;
        }

        if (normalized === windowObj.location.href) {
          continue;
        }

        if (seen.has(normalized)) {
          continue;
        }

        seen.add(normalized);
        links.push(normalized);
      }
      return links;
    };

    const captureOnce = async () => {
      const result = await forwarder.send({ force: true });
      if (result?.ok === false) {
        return { ok: false, error: result.error?.message ?? "Capture failed" };
      }
      return { ok: true };
    };

    const start = () => {
      if (observer) {
        console.log("[ADA] already started");
        return;
      }

      console.log("[ADA] starting observer on", windowObj.location.href);

      observer = new windowObj.MutationObserver(() => {
        // schedule can be very chatty; keep log minimal
        forwarder.schedule();
        scheduleRefresh();
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
          .then((result) => {
            if (result?.ok === false) {
              console.warn("[ADA] initial send failed", result.error ?? result.status ?? "");
              return;
            }
            console.log("[ADA] initial send done");
          })
          .catch((e) => console.error("[ADA] initial send failed", e));
    };

    const stop = () => {
      if (!observer) {
        console.log("[ADA] already stopped");
        return;
      }
      observer.disconnect();
      observer = null;
      lastIssues = [];
      clearRefreshTimeout();
      highlighter.clearHighlights();
      console.log("[ADA] stopped");
    };

    const handleToggle = (enabled) => {
      console.log("[ADA] toggle:", enabled);
      enabled ? start() : stop();
    };

    chromeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === "toggle") {
        handleToggle(!!message.enabled);
        return;
      }

      if (message?.type === "spider-collect") {
        Promise.resolve()
          .then(() => ({ links: collectVisibleLinks() }))
          .then((payload) => sendResponse(payload))
          .catch((error) => sendResponse({ error: error.message }));
        return true;
      }

      if (message?.type === "spider-capture") {
        Promise.resolve()
          .then(() => captureOnce())
          .then((payload) => sendResponse(payload))
          .catch((error) => sendResponse({ ok: false, error: error.message }));
        return true;
      }
    });

    chromeApi.storage.local.get({ enabled: false }, (state) => {
      console.log("[ADA] initial enabled state:", state.enabled);
      handleToggle(!!state.enabled);
    });

    return {
      start,
      stop,
      handleToggle,
      getObserver: () => observer,
      collectVisibleLinks,
      captureOnce
    };
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
