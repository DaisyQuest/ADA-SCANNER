const DEFAULT_SERVER_URL = "http://localhost:3000/capture";
const DEFAULT_DEBOUNCE_MS = 500;

const normalizeHtml = (documentRoot) => documentRoot?.documentElement?.outerHTML ?? "";

const createPayload = ({ url, html, title, contentType = "text/html" }) => ({
  url,
  html,
  title,
  contentType,
  kind: "html"
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
  if (!nextHtml) {
    return { shouldSend: false, nextHash: previousHash };
  }

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
    if (!result.shouldSend) {
      return;
    }

    const config = await getConfig();
    const payload = createPayload({
      url: location.href,
      html,
      title: documentRoot.title,
      contentType: "text/html"
    });

    await fetchFn(config.serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  };

  const schedule = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
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

if (typeof module !== "undefined") {
  module.exports = {
    DEFAULT_SERVER_URL,
    DEFAULT_DEBOUNCE_MS,
    normalizeHtml,
    createPayload,
    createHash,
    shouldForwardUpdate,
    createForwarder,
    getDefaultConfig
  };
}
