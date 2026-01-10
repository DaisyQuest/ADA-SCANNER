(() => {
  const SIDEBAR_ID = "ada-report-sidebar";
  const SIDEBAR_STYLE_ID = "ada-report-sidebar-style";
  const REPORT_SIDEBAR_ATTR = "data-ada-report-sidebar";
  const ISSUE_STALE_CLASS = "ada-report-issue--stale";

  const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const ensureStyles = (documentRoot) => {
    if (documentRoot.getElementById(SIDEBAR_STYLE_ID)) {
      return;
    }

    const style = documentRoot.createElement("style");
    style.id = SIDEBAR_STYLE_ID;
    style.setAttribute(REPORT_SIDEBAR_ATTR, "true");
    style.textContent = `
      #${SIDEBAR_ID} {
        position: fixed;
        top: 64px;
        right: 16px;
        width: 320px;
        max-height: calc(100vh - 96px);
        background: #111827;
        color: #f9fafb;
        border-radius: 12px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
        font-family: "Segoe UI", Roboto, Arial, sans-serif;
        z-index: 2147483646;
        display: flex;
        flex-direction: column;
      }
      #${SIDEBAR_ID} .ada-report-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      #${SIDEBAR_ID} .ada-report-title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      #${SIDEBAR_ID} .ada-report-count {
        background: #e11d48;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 700;
      }
      #${SIDEBAR_ID} .ada-report-body {
        overflow-y: auto;
        padding: 8px 8px 12px 8px;
      }
      #${SIDEBAR_ID} .ada-report-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${SIDEBAR_ID} .ada-report-item {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${SIDEBAR_ID} .ada-report-item.${ISSUE_STALE_CLASS} {
        opacity: 0.55;
        filter: grayscale(0.35);
      }
      #${SIDEBAR_ID} .ada-report-item.${ISSUE_STALE_CLASS} .ada-report-status {
        color: #9ca3af;
      }
      #${SIDEBAR_ID} .ada-report-rule {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #f97316;
      }
      #${SIDEBAR_ID} .ada-report-message {
        font-size: 13px;
        line-height: 1.3;
      }
      #${SIDEBAR_ID} .ada-report-meta {
        font-size: 11px;
        color: #d1d5db;
      }
      #${SIDEBAR_ID} .ada-report-status {
        font-size: 11px;
        font-weight: 600;
        color: #22c55e;
      }
      #${SIDEBAR_ID} .ada-report-empty {
        font-size: 12px;
        color: #d1d5db;
        text-align: center;
        padding: 24px 8px;
      }
      #${SIDEBAR_ID} button {
        all: unset;
        cursor: pointer;
        display: block;
      }
      #${SIDEBAR_ID} button:focus-visible {
        outline: 2px solid #38bdf8;
        outline-offset: 2px;
        border-radius: 6px;
      }
    `;
    documentRoot.head.appendChild(style);
  };

  const normalizeList = (items) => (Array.isArray(items) ? items : []);

  const buildElements = (documentRoot) => {
    const container = documentRoot.createElement("aside");
    container.id = SIDEBAR_ID;
    container.setAttribute(REPORT_SIDEBAR_ATTR, "true");
    container.setAttribute("role", "complementary");
    container.setAttribute("aria-label", "ADA Scanner report");

    const header = documentRoot.createElement("div");
    header.className = "ada-report-header";

    const title = documentRoot.createElement("div");
    title.className = "ada-report-title";
    title.textContent = "ADA report";

    const count = documentRoot.createElement("div");
    count.className = "ada-report-count";
    count.textContent = "0";

    header.appendChild(title);
    header.appendChild(count);

    const body = documentRoot.createElement("div");
    body.className = "ada-report-body";

    const list = documentRoot.createElement("ul");
    list.className = "ada-report-list";
    list.setAttribute("aria-live", "polite");

    body.appendChild(list);
    container.appendChild(header);
    container.appendChild(body);

    documentRoot.body.appendChild(container);

    return {
      container,
      count,
      list
    };
  };

  const createReportSidebar = ({ documentRoot, windowObj, resolveTargets }) => {
    let elements = null;
    let lastIssues = [];

    const ensureSidebar = () => {
      if (elements) {
        return;
      }
      ensureStyles(documentRoot);
      elements = buildElements(documentRoot);
    };

    const getIssueLabel = (issue) => {
      const message = normalizeText(issue?.message);
      if (message) {
        return message;
      }
      const ruleId = normalizeText(issue?.ruleId);
      return ruleId || "Issue";
    };

    const getRuleLabel = (issue) => normalizeText(issue?.ruleId || "Unspecified rule");

    const getMetaLabel = (issue) => {
      const parts = [];
      if (issue?.filePath) {
        parts.push(issue.filePath);
      }
      if (issue?.line) {
        parts.push(`Line ${issue.line}`);
      }
      return parts.join(" • ");
    };

    const hasTargets = (issue) => {
      if (typeof resolveTargets !== "function") {
        return false;
      }
      try {
        return resolveTargets(documentRoot, issue).length > 0;
      } catch {
        return false;
      }
    };

    const renderIssues = (issues) => {
      ensureSidebar();
      lastIssues = normalizeList(issues);
      elements.count.textContent = String(lastIssues.length);
      elements.list.innerHTML = "";

      if (!lastIssues.length) {
        const empty = documentRoot.createElement("li");
        empty.className = "ada-report-empty";
        empty.textContent = "No issues captured yet.";
        elements.list.appendChild(empty);
        return;
      }

      lastIssues.forEach((issue) => {
        const item = documentRoot.createElement("li");
        const stale = !hasTargets(issue);
        item.className = `ada-report-item${stale ? ` ${ISSUE_STALE_CLASS}` : ""}`;

        const button = documentRoot.createElement("button");
        button.type = "button";
        button.addEventListener("click", () => {
          if (!hasTargets(issue)) {
            return;
          }
          const targets = resolveTargets(documentRoot, issue);
          const target = targets[0];
          /* istanbul ignore next */
          if (target?.scrollIntoView) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          /* istanbul ignore next */
          if (target?.focus) {
            target.focus({ preventScroll: true });
          }
        });

        const rule = documentRoot.createElement("div");
        rule.className = "ada-report-rule";
        rule.textContent = getRuleLabel(issue);

        const message = documentRoot.createElement("div");
        message.className = "ada-report-message";
        message.textContent = getIssueLabel(issue);

        const meta = documentRoot.createElement("div");
        meta.className = "ada-report-meta";
        meta.textContent = getMetaLabel(issue);

        const status = documentRoot.createElement("div");
        status.className = "ada-report-status";
        status.textContent = stale ? "Not currently in DOM" : "In DOM";

        button.appendChild(rule);
        button.appendChild(message);
        if (meta.textContent) {
          button.appendChild(meta);
        }
        button.appendChild(status);
        item.appendChild(button);
        elements.list.appendChild(item);
      });
    };

    const refresh = () => {
      if (!elements) {
        return;
      }
      renderIssues(lastIssues);
    };

    const destroy = () => {
      if (elements?.container) {
        elements.container.remove();
      }
      const style = documentRoot.getElementById(SIDEBAR_STYLE_ID);
      if (style) {
        style.remove();
      }
      elements = null;
      lastIssues = [];
    };

    return {
      render: renderIssues,
      refresh,
      destroy
    };
  };

  const api = {
    createReportSidebar,
    REPORT_SIDEBAR_ATTR
  };

  globalThis.AdaReportSidebar = api;

  /* istanbul ignore next */
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
