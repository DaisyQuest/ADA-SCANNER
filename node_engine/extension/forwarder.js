(() => {
  const DEFAULT_SERVER_URL = "http://127.0.0.1:45892/capture";
  const DEFAULT_DEBOUNCE_MS = 500;

  const normalizeHtml = (documentRoot) =>
      documentRoot?.documentElement?.outerHTML ?? "";

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
                           kind = "html"
                         }) => ({
    // Node listener (required)
    url,
    html,
    title,
    contentType,
    kind,

    // .NET listener (safe duplicates)
    Url: url,
    Html: html,
    Title: title,
    ContentType: contentType,
    StatusCode: statusCode
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
                             debounceMs = DEFAULT_DEBOUNCE_MS
                           }) => {
    let lastHash = null;
    let timeout = null;

    const send = async () => {
      const html = normalizeHtml(documentRoot);
      const result = shouldForwardUpdate(lastHash, html);
      lastHash = result.nextHash;

      if (!result.shouldSend) return;

      const config = await getConfig();

      const payload = createPayload({
        url: location.href,
        html,
        contentType: "text/html; charset=utf-8",
        statusCode: 200
      });

      const resp = await fetchFn(config.serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn("[ADA] capture failed", resp.status, text);
      }
    };

    const schedule = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        send();
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
    createPayload,
    createHash,
    shouldForwardUpdate,
    createForwarder,
    getDefaultConfig
  };

  // Expose to content script
  globalThis.AdaForwarder = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
