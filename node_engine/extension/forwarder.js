(() => {
  const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";
  const DEFAULT_DEBOUNCE_MS = 500;

  const HIGHLIGHT_CLASS = "ada-highlight";
  const HIGHLIGHT_STYLE_ID = "ada-highlight-style";
  const HIGHLIGHT_ATTRIBUTES = [
    "data-ada-issue-count",
    "data-ada-issue-message",
    "data-ada-original-title"
  ];

  const stripHighlights = (rootElement) => {
    if (!rootElement) {
      return;
    }

    const style = rootElement.querySelector(`#${HIGHLIGHT_STYLE_ID}`);
    if (style) {
      style.remove();
    }

    const highlighted = rootElement.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
    highlighted.forEach((element) => {
      element.classList.remove(HIGHLIGHT_CLASS);
      const originalTitle = element.getAttribute("data-ada-original-title");
      if (originalTitle) {
        element.setAttribute("title", originalTitle);
      } else {
        element.removeAttribute("title");
      }
      HIGHLIGHT_ATTRIBUTES.forEach((attr) => element.removeAttribute(attr));
    });
  };

  const normalizeHtml = (documentRoot) => {
    const root = documentRoot?.documentElement;
    if (!root) {
      return "";
    }

    const clone = root.cloneNode(true);
    stripHighlights(clone);
    return clone.outerHTML ?? "";
  };

  // IMPORTANT:
  // - Node listener requires lowercase `url` and `html`
  // - .NET listener expects `Url` and `Html`
  // We send BOTH to stay compatible with both engines.
  const createPayload = ({
                           url,
                           html,
                           title = null,
                           contentType = "text/html",
                           statusCode = 200,
                           kind = "html",
                           changeSource = "initial",
                           frameContext = null
                         }) => ({
    // Node listener (required)
    url,
    html,
    title,
    contentType,
    kind,
    changeSource,
    frameContext,

    // .NET listener (safe duplicates)
    Url: url,
    Html: html,
    Title: title,
    ContentType: contentType,
    StatusCode: statusCode,
    ChangeSource: changeSource,
    FrameContext: frameContext
  });

  const createHash = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };

  const shouldForwardUpdate = (previousHash, nextHtml) => {
    if (!nextHtml) return { shouldSend: false, nextHash: previousHash };

    const nextHash = createHash(nextHtml);
    if (nextHash === previousHash) {
      return { shouldSend: false, nextHash };
    }

    return { shouldSend: true, nextHash };
  };

  const createForwarder = ({
                             fetchFn,
                             documentRoot,
                             location,
                             getConfig,
                             onReport,
                             debounceMs = DEFAULT_DEBOUNCE_MS
                           }) => {
    let lastHash = null;
    let timeout = null;

    const send = async ({ force = false, changeSource = "initial", frameContext = null } = {}) => {
      const html = normalizeHtml(documentRoot);
      const result = force ? { shouldSend: true, nextHash: createHash(html) } : shouldForwardUpdate(lastHash, html);
      lastHash = result.nextHash;

      if (!result.shouldSend) return { ok: true, skipped: true };

      const config = await getConfig();

      const payload = createPayload({
        url: location.href,
        html,
        contentType: "text/html; charset=utf-8",
        statusCode: 200,
        changeSource,
        frameContext
      });

      let resp;
      try {
        resp = await fetchFn(config.serverUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.warn("[ADA] capture failed", error);
        return { ok: false, error };
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn("[ADA] capture failed", resp.status, text);
        return { ok: false, status: resp.status, errorText: text };
      }

      if (typeof onReport === "function") {
        try {
          const responsePayload = await resp.json();
          onReport(responsePayload);
        } catch (error) {
          console.warn("[ADA] unable to parse capture response", error);
        }
      }

      return { ok: true };
    };

    const schedule = ({ changeSource = "mutation", frameContext = null } = {}) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        send({ changeSource, frameContext });
      }, debounceMs);
    };

    return { send, schedule };
  };

  const getDefaultConfig = async (storageApi) => {
    const config = await new Promise((resolve) => {
      storageApi.get({ serverUrl: DEFAULT_SERVER_URL }, resolve);
    });
    return config;
  };

  const api = {
    DEFAULT_SERVER_URL,
    DEFAULT_DEBOUNCE_MS,
    normalizeHtml,
    stripHighlights,
    createPayload,
    createHash,
    shouldForwardUpdate,
    createForwarder,
    getDefaultConfig
  };

  // Expose to content script
  globalThis.AdaForwarder = api;

  /* istanbul ignore next */
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
