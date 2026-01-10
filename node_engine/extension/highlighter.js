(() => {
  const STYLE_ID = "ada-highlight-style";
  const HIGHLIGHT_CLASS = "ada-highlight";
  const ACTIVE_CLASS = "ada-highlight-active";
  const ISSUE_COUNT_ATTR = "data-ada-issue-count";
  const ISSUE_MESSAGE_ATTR = "data-ada-issue-message";
  const ORIGINAL_TITLE_ATTR = "data-ada-original-title";

  const normalizeText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  const ensureStyles = (documentRoot) => {
    if (documentRoot.getElementById(STYLE_ID)) {
      return;
    }

    const style = documentRoot.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        outline: 3px solid #e11d48 !important;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.2);
        position: relative;
        border-radius: 4px;
      }
      .${HIGHLIGHT_CLASS}::after {
        content: attr(${ISSUE_COUNT_ATTR});
        position: absolute;
        top: -10px;
        right: -10px;
        background: #e11d48;
        color: #fff;
        border-radius: 999px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 700;
        pointer-events: none;
      }
      .${HIGHLIGHT_CLASS}::before {
        content: attr(${ISSUE_MESSAGE_ATTR});
        position: absolute;
        left: 0;
        bottom: calc(100% + 8px);
        background: #111827;
        color: #f9fafb;
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.4;
        max-width: 260px;
        white-space: normal;
        opacity: 0;
        transform: translateY(4px);
        transition: opacity 0.15s ease, transform 0.15s ease;
        pointer-events: none;
        z-index: 2147483647;
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.25);
      }
      .${HIGHLIGHT_CLASS}:hover::before,
      .${HIGHLIGHT_CLASS}:focus-visible::before {
        opacity: 1;
        transform: translateY(0);
      }
      @media (prefers-reduced-motion: reduce) {
        .${HIGHLIGHT_CLASS}::before {
          transition: none;
        }
      }
      .${ACTIVE_CLASS} {
        outline: 3px solid #38bdf8 !important;
        outline-offset: 3px;
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.35);
      }
      .${ACTIVE_CLASS}::after {
        background: #38bdf8;
      }
    `;
    documentRoot.head.appendChild(style);
  };

  const parseEvidence = (evidence) => {
    const trimmed = normalizeText(evidence);
    if (!trimmed.startsWith("<")) {
      return null;
    }

    const match = trimmed.match(/^<([a-z0-9-]+)([^>]*)>/i);
    if (!match) {
      return null;
    }

    const tag = match[1];
    const attrs = match[2] ?? "";
    const idMatch = attrs.match(/\sid=["']([^"']+)["']/i);
    const classMatch = attrs.match(/\sclass=["']([^"']+)["']/i);
    const nameMatch = attrs.match(/\sname=["']([^"']+)["']/i);
    const ariaLabelMatch = attrs.match(/\saria-label=["']([^"']+)["']/i);
    const roleMatch = attrs.match(/\srole=["']([^"']+)["']/i);
    const typeMatch = attrs.match(/\stype=["']([^"']+)["']/i);
    const hrefMatch = attrs.match(/\shref=["']([^"']+)["']/i);

    return {
      tag,
      id: idMatch?.[1] ?? null,
      classes: classMatch?.[1]?.split(/\s+/).filter(Boolean) ?? [],
      name: nameMatch?.[1] ?? null,
      ariaLabel: ariaLabelMatch?.[1] ?? null,
      role: roleMatch?.[1] ?? null,
      type: typeMatch?.[1] ?? null,
      href: hrefMatch?.[1] ?? null
    };
  };

  const escapeCssValue = (value) => {
    if (globalThis.CSS?.escape) {
      return CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  };

  const buildSelector = (parsed) => {
    if (!parsed) return null;
    if (parsed.id) {
      return `#${escapeCssValue(parsed.id)}`;
    }

    const parts = [parsed.tag];
    if (parsed.classes.length) {
      parts.push(parsed.classes.map((name) => `.${escapeCssValue(name)}`).join(""));
    }
    if (parsed.name) {
      parts.push(`[name="${escapeCssValue(parsed.name)}"]`);
    }
    if (parsed.ariaLabel) {
      parts.push(`[aria-label="${escapeCssValue(parsed.ariaLabel)}"]`);
    }
    if (parsed.role) {
      parts.push(`[role="${escapeCssValue(parsed.role)}"]`);
    }
    if (parsed.type) {
      parts.push(`[type="${escapeCssValue(parsed.type)}"]`);
    }
    if (parsed.href) {
      parts.push(`[href="${escapeCssValue(parsed.href)}"]`);
    }
    const selector = parts.filter(Boolean).join("");
    return selector.trim() ? selector : null;
  };

  const findMatchesByEvidence = (documentRoot, evidence) => {
    const normalizedEvidence = normalizeText(evidence);
    if (!normalizedEvidence || normalizedEvidence.length > 2000) {
      return [];
    }

    const parsed = parseEvidence(normalizedEvidence);
    const selector = buildSelector(parsed);
    if (selector) {
      const matches = Array.from(documentRoot.querySelectorAll(selector));
      if (matches.length) {
        return matches;
      }
    }

    if (parsed?.tag) {
      const elements = Array.from(documentRoot.getElementsByTagName(parsed.tag));
      return elements.filter((element) => normalizeText(element.outerHTML).includes(normalizedEvidence));
    }

    return [];
  };

  const resolveTargets = (documentRoot, issue) => {
    if (!issue) return [];
    if (issue.selector) {
      try {
        return Array.from(documentRoot.querySelectorAll(issue.selector));
      } catch (error) {
        return [];
      }
    }

    if (issue.evidence) {
      return findMatchesByEvidence(documentRoot, issue.evidence);
    }

    return [];
  };

  const normalizeList = (items) => (Array.isArray(items) ? items : []);

  const filterIssuesForPage = (issues, url) =>
    normalizeList(issues).filter((issue) => {
      if (!issue?.filePath) {
        return true;
      }
      return normalizeText(issue.filePath) === normalizeText(url);
    });

  const createHighlighter = ({ documentRoot }) => {
    const highlighted = new Set();
    const activeTargets = new Set();

    const clearActiveHighlights = () => {
      for (const element of activeTargets) {
        element.classList.remove(ACTIVE_CLASS);
      }
      activeTargets.clear();
    };

    const clearHighlights = () => {
      clearActiveHighlights();
      for (const element of highlighted) {
        element.classList.remove(HIGHLIGHT_CLASS);
        element.removeAttribute(ISSUE_COUNT_ATTR);
        element.removeAttribute(ISSUE_MESSAGE_ATTR);
        if (element.hasAttribute(ORIGINAL_TITLE_ATTR)) {
          element.setAttribute("title", element.getAttribute(ORIGINAL_TITLE_ATTR));
          element.removeAttribute(ORIGINAL_TITLE_ATTR);
        } else {
          element.removeAttribute("title");
        }
      }
      highlighted.clear();
    };

    const focusIssue = (issue) => {
      clearActiveHighlights();
      const targets = resolveTargets(documentRoot, issue);
      if (!targets.length) {
        return false;
      }
      ensureStyles(documentRoot);
      targets.forEach((element) => {
        element.classList.add(ACTIVE_CLASS);
        activeTargets.add(element);
      });
      return true;
    };

    const applyHighlights = (issues) => {
      clearHighlights();
      const list = normalizeList(issues);
      if (!list.length) {
        return;
      }

      ensureStyles(documentRoot);
      const elementMap = new Map();

      for (const issue of list) {
        const targets = resolveTargets(documentRoot, issue);
        for (const element of targets) {
          const entries = elementMap.get(element) ?? [];
          entries.push(issue);
          elementMap.set(element, entries);
        }
      }

      for (const [element, elementIssues] of elementMap.entries()) {
        const messages = elementIssues
          .map((issue) => issue.message || issue.ruleId || "Issue")
          .filter(Boolean);
        const title = messages.join(" • ");
        if (element.hasAttribute("title")) {
          element.setAttribute(ORIGINAL_TITLE_ATTR, element.getAttribute("title"));
        }
        element.setAttribute("title", title);
        element.setAttribute(ISSUE_COUNT_ATTR, String(elementIssues.length));
        element.setAttribute(ISSUE_MESSAGE_ATTR, title);
        element.classList.add(HIGHLIGHT_CLASS);
        highlighted.add(element);
      }
    };

    return {
      applyHighlights,
      focusIssue,
      clearHighlights,
      resolveTargets,
      filterIssuesForPage
    };
  };

  const api = {
    createHighlighter,
    filterIssuesForPage
  };

  globalThis.AdaHighlighter = api;

  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
