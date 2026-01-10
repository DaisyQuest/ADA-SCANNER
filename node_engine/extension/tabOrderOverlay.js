(() => {
  const OVERLAY_ID = "ada-tab-order-overlay";
  const STYLE_ID = "ada-tab-order-style";
  const OVERLAY_ATTR = "data-ada-tab-order";
  const MARKER_CLASS = "ada-tab-order-marker";
  const LINE_CLASS = "ada-tab-order-line";
  const ARROW_ID = "ada-tab-order-arrow";

  const ensureStyles = (documentRoot) => {
    if (documentRoot.getElementById(STYLE_ID)) {
      return;
    }

    const style = documentRoot.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute(OVERLAY_ATTR, "true");
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 2147483645;
        font-family: "Segoe UI", Roboto, Arial, sans-serif;
      }
      #${OVERLAY_ID} svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      #${OVERLAY_ID} .${LINE_CLASS} {
        stroke: #32cd32;
        stroke-width: 2;
        fill: none;
        marker-end: url(#${ARROW_ID});
      }
      #${OVERLAY_ID} .${MARKER_CLASS} {
        position: absolute;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: #32cd32;
        color: #0f172a;
        font-size: 12px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        transform: translate(-50%, -50%);
      }
    `;
    documentRoot.head.appendChild(style);
  };

  const isDisabled = (element) => element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";

  const isVisible = (windowObj, element) => {
    if (!element) {
      return false;
    }

    const style = windowObj.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  };

  const getTabIndexValue = (element) => {
    const attr = element.getAttribute("tabindex");
    if (attr == null) {
      return element.tabIndex;
    }
    const parsed = Number.parseInt(attr, 10);
    if (Number.isNaN(parsed)) {
      return element.tabIndex;
    }
    return parsed;
  };

  const isFocusable = (element) => {
    if (!element || isDisabled(element)) {
      return false;
    }

    if (element.getAttribute("contenteditable") === "false") {
      return false;
    }

    const tabIndex = getTabIndexValue(element);
    return tabIndex >= 0;
  };

  const getFocusableElements = (documentRoot, windowObj) => {
    const selector = [
      "a[href]",
      "area[href]",
      "button",
      "input",
      "select",
      "textarea",
      "iframe",
      "[tabindex]",
      "[contenteditable]",
      "audio[controls]",
      "video[controls]",
      "summary"
    ].join(",");

    const nodes = Array.from(documentRoot.querySelectorAll(selector));
    const seen = new Set();
    const positives = [];
    const normals = [];

    nodes.forEach((node, index) => {
      if (seen.has(node)) {
        return;
      }
      seen.add(node);

      if (!isFocusable(node)) {
        return;
      }

      if (!isVisible(windowObj, node)) {
        return;
      }

      const tabIndex = getTabIndexValue(node);
      const entry = { element: node, tabIndex, order: index };
      if (tabIndex > 0) {
        positives.push(entry);
      } else {
        normals.push(entry);
      }
    });

    positives.sort((a, b) => {
      if (a.tabIndex !== b.tabIndex) {
        return a.tabIndex - b.tabIndex;
      }
      return a.order - b.order;
    });

    return positives.concat(normals).map((entry) => entry.element);
  };

  const createSvgLayer = (documentRoot) => {
    const svg = documentRoot.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    const defs = documentRoot.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = documentRoot.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", ARROW_ID);
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "10");
    marker.setAttribute("refX", "6");
    marker.setAttribute("refY", "3");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");

    const arrowPath = documentRoot.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute("d", "M0,0 L0,6 L6,3 z");
    arrowPath.setAttribute("fill", "#32cd32");

    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);
    return svg;
  };

  const createTabOrderOverlay = ({ documentRoot, windowObj }) => {
    let overlay = null;
    let svg = null;
    let enabled = false;
    let markers = [];

    const clearMarkers = () => {
      markers.forEach((marker) => marker.remove());
      markers = [];
      if (svg) {
        Array.from(svg.querySelectorAll(`.${LINE_CLASS}`)).forEach((path) => path.remove());
      }
    };

    const ensureOverlay = () => {
      if (overlay) {
        return;
      }
      ensureStyles(documentRoot);
      overlay = documentRoot.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.setAttribute(OVERLAY_ATTR, "true");
      overlay.setAttribute("aria-hidden", "true");
      svg = createSvgLayer(documentRoot);
      overlay.appendChild(svg);
      documentRoot.body.appendChild(overlay);
    };

    const render = () => {
      if (!enabled) {
        return;
      }
      ensureOverlay();
      clearMarkers();

      const elements = getFocusableElements(documentRoot, windowObj);
      if (!elements.length) {
        return;
      }

      const points = [];
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        points.push({ x: centerX, y: centerY });

        const marker = documentRoot.createElement("div");
        marker.className = MARKER_CLASS;
        marker.textContent = String(index + 1);
        marker.style.left = `${centerX}px`;
        marker.style.top = `${centerY}px`;
        overlay.appendChild(marker);
        markers.push(marker);
      });

      for (let i = 0; i < points.length - 1; i += 1) {
        const path = documentRoot.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("class", LINE_CLASS);
        path.setAttribute("d", `M ${points[i].x} ${points[i].y} L ${points[i + 1].x} ${points[i + 1].y}`);
        svg.appendChild(path);
      }
    };

    const onViewportChange = () => render();

    const enable = () => {
      if (enabled) {
        render();
        return;
      }
      enabled = true;
      windowObj.addEventListener("scroll", onViewportChange, true);
      windowObj.addEventListener("resize", onViewportChange);
      render();
    };

    const disable = () => {
      if (!enabled) {
        return;
      }
      enabled = false;
      windowObj.removeEventListener("scroll", onViewportChange, true);
      windowObj.removeEventListener("resize", onViewportChange);
      clearMarkers();
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      const style = documentRoot.getElementById(STYLE_ID);
      if (style) {
        style.remove();
      }
      svg = null;
    };

    const destroy = () => {
      disable();
    };

    return {
      enable,
      disable,
      refresh: render,
      destroy
    };
  };

  const api = {
    createTabOrderOverlay,
    TAB_ORDER_OVERLAY_ATTR: OVERLAY_ATTR
  };

  globalThis.AdaTabOrderOverlay = api;

  /* istanbul ignore next */
  if (typeof module !== "undefined") {
    module.exports = api;
  }
})();
