(() => {
  const OVERLAY_ID = "ada-tab-order-overlay";
  const STYLE_ID = "ada-tab-order-style";
  const OVERLAY_ATTR = "data-ada-tab-order";
  const MARKER_CLASS = "ada-tab-order-marker";
  const LINE_CLASS = "ada-tab-order-line";
  const ARROW_ID = "ada-tab-order-arrow";
  const OBSERVED_ATTRIBUTES = ["tabindex", "disabled", "style", "hidden", "aria-disabled", "contenteditable", "aria-hidden"];

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

  const compareOrderKeys = (left, right) => {
    const length = Math.max(left.length, right.length);
    for (let i = 0; i < length; i += 1) {
      if (left[i] == null) {
        return -1;
      }
      if (right[i] == null) {
        return 1;
      }
      if (left[i] !== right[i]) {
        return left[i] - right[i];
      }
    }
    return 0;
  };

  const getFrameDocument = (frame) => {
    try {
      return frame.contentDocument || null;
    } catch (error) {
      return null;
    }
  };

  const getFrameWindow = (frame) => {
    try {
      return frame.contentWindow || null;
    } catch (error) {
      return null;
    }
  };

  const collectFocusableEntries = ({ documentRoot, windowObj, orderPath, offset }) => {
    const root = documentRoot.body || documentRoot;
    if (!root) {
      return [];
    }
    const nodeFilter = (documentRoot.defaultView && documentRoot.defaultView.NodeFilter) || globalThis.NodeFilter;
    if (!nodeFilter) {
      return [];
    }
    const walker = documentRoot.createTreeWalker(root, nodeFilter.SHOW_ELEMENT);
    const entries = [];
    let index = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      index += 1;
      const orderKey = orderPath.concat(index);

      if (node.tagName === "IFRAME") {
        if (isVisible(windowObj, node)) {
          const frameDocument = getFrameDocument(node);
          const frameWindow = getFrameWindow(node);
          if (frameDocument && frameWindow) {
            const frameRect = node.getBoundingClientRect();
            entries.push(
              ...collectFocusableEntries({
                documentRoot: frameDocument,
                windowObj: frameWindow,
                orderPath: orderKey,
                offset: {
                  x: offset.x + frameRect.left,
                  y: offset.y + frameRect.top
                }
              })
            );
          }
        }
      }

      if (!isFocusable(node)) {
        continue;
      }

      if (!isVisible(windowObj, node)) {
        continue;
      }

      const tabIndex = getTabIndexValue(node);
      entries.push({ element: node, tabIndex, orderKey, offset });
    }
    return entries;
  };

  const getFocusableElements = (documentRoot, windowObj) => {
    const entries = collectFocusableEntries({
      documentRoot,
      windowObj,
      orderPath: [],
      offset: { x: 0, y: 0 }
    });
    const positives = [];
    const normals = [];

    entries.forEach((entry) => {
      if (entry.tabIndex > 0) {
        positives.push(entry);
      } else {
        normals.push(entry);
      }
    });

    positives.sort((a, b) => {
      if (a.tabIndex !== b.tabIndex) {
        return a.tabIndex - b.tabIndex;
      }
      return compareOrderKeys(a.orderKey, b.orderKey);
    });

    normals.sort((a, b) => compareOrderKeys(a.orderKey, b.orderKey));

    return positives.concat(normals);
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
    let renderScheduled = false;
    const observers = new Map();
    const frameListeners = new Map();

    const scheduleRender = () => {
      if (!enabled || renderScheduled) {
        return;
      }
      renderScheduled = true;
      const callback = () => {
        renderScheduled = false;
        render();
      };
      if (typeof windowObj.requestAnimationFrame === "function") {
        const runOnce = () => {
          if (!renderScheduled) {
            return;
          }
          callback();
        };
        windowObj.requestAnimationFrame(runOnce);
        windowObj.setTimeout(runOnce, 0);
        return;
      }
      windowObj.setTimeout(callback, 0);
    };

    const observeDocument = (targetDocument) => {
      if (observers.has(targetDocument)) {
        return;
      }
      const observerWindow = targetDocument.defaultView || windowObj;
      if (!observerWindow || !observerWindow.MutationObserver) {
        return;
      }
      const observer = new observerWindow.MutationObserver(() => {
        scheduleRender();
      });
      const rootNode = targetDocument.body || targetDocument.documentElement || targetDocument;
      observer.observe(rootNode, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: OBSERVED_ATTRIBUTES
      });
      observers.set(targetDocument, observer);
    };

    const disconnectObservers = () => {
      observers.forEach((observer) => observer.disconnect());
      observers.clear();
      frameListeners.forEach((handler, frame) => {
        frame.removeEventListener("load", handler);
      });
      frameListeners.clear();
    };

    const registerFrameListener = (frame) => {
      if (frameListeners.has(frame)) {
        return;
      }
      const handler = () => {
        syncFrameObservers();
        scheduleRender();
      };
      frame.addEventListener("load", handler);
      frameListeners.set(frame, handler);
    };

    const syncFrameObservers = () => {
      const frames = Array.from(documentRoot.querySelectorAll("iframe"));
      frames.forEach((frame) => {
        registerFrameListener(frame);
        const frameDocument = getFrameDocument(frame);
        if (frameDocument) {
          observeDocument(frameDocument);
        }
      });
    };

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

      syncFrameObservers();
      observeDocument(documentRoot);

      const elements = getFocusableElements(documentRoot, windowObj);
      if (!elements.length) {
        return;
      }

      const points = [];
      elements.forEach((entry, index) => {
        const rect = entry.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 + entry.offset.x;
        const centerY = rect.top + rect.height / 2 + entry.offset.y;
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
      disconnectObservers();
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
