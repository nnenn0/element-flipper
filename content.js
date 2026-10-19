console.log("Element Flipper: content script loaded");

if (window.elementFlipperLoaded) {
  console.log("Element Flipper already loaded");
} else {
  window.elementFlipperLoaded = true;

  let isActive = false;
  let highlightedEl = null;
  let highlightOverlay = null;
  const originalTransforms = new WeakMap();

  function updateHighlightOverlay() {
    if (!highlightedEl || !highlightOverlay) return;
    const rect = highlightedEl.getBoundingClientRect();
    highlightOverlay.style.setProperty("left", `${rect.left}px`, "important");
    highlightOverlay.style.setProperty("top", `${rect.top}px`, "important");
    highlightOverlay.style.setProperty("width", `${rect.width}px`, "important");
    highlightOverlay.style.setProperty("height", `${rect.height}px`, "important");
  }

  function clearHighlight() {
    highlightedEl = null;
    if (highlightOverlay) {
      highlightOverlay.remove();
      highlightOverlay = null;
    }
  }

  function setHighlight(el) {
    if (!el) {
      clearHighlight();
      return;
    }

    highlightedEl = el;
    if (!highlightOverlay) {
      highlightOverlay = document.createElement("div");
      highlightOverlay.setAttribute("aria-hidden", "true");
      highlightOverlay.style.cssText =
        "all: initial !important; display: block !important; position: fixed !important; " +
        "pointer-events: none !important; box-sizing: border-box !important; " +
        "outline: 3px solid red !important; z-index: 2147483647 !important;";
      document.documentElement.appendChild(highlightOverlay);
    }
    updateHighlightOverlay();
  }

  // pointermove を使ってマウス下の要素を拾う（安定）
  function onPointerMove(e) {
    if (!isActive) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    setHighlight(el);
  }

  // クリックで反転（トグル）
  function onClick(e) {
    if (!isActive) return;
    // 反転操作のみを行いたいのでイベントの伝播を止める
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (!el) return;

    if (!originalTransforms.has(el)) {
      const originalValue = el.style.getPropertyValue("transform");
      const originalPriority = el.style.getPropertyPriority("transform");
      const computedTransform = getComputedStyle(el).transform;

      originalTransforms.set(el, { value: originalValue, priority: originalPriority });
      // 既存の CSS による変形も維持し、その上で要素を左右反転する。
      const flippedTransform =
        computedTransform === "none"
          ? "scaleX(-1)"
          : `${computedTransform} scaleX(-1)`;
      el.style.setProperty("transform", flippedTransform, "important");
      console.log("Flipped:", el);
    } else {
      const { value, priority } = originalTransforms.get(el);
      if (value) {
        el.style.setProperty("transform", value, priority);
      } else {
        el.style.removeProperty("transform");
      }
      originalTransforms.delete(el);
      console.log("Unflipped:", el);
    }

    // 操作後はモードを終了
    deactivate();
  }

  function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === "Escape") {
      deactivate();
    }
  }

  function activate() {
    if (isActive) return;
    isActive = true;
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("scroll", updateHighlightOverlay, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", updateHighlightOverlay);
    console.log("Element Flipper activated");
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("scroll", updateHighlightOverlay, true);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", updateHighlightOverlay);
    clearHighlight();
    console.log("Element Flipper deactivated");
  }

  // popupからのメッセージを受ける
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Element Flipper received message:", message);
    if (message.action === "activate") {
      activate();
      sendResponse({ success: true });
      // no async work -> return false
      return false;
    } else {
      sendResponse({ success: false, error: "unknown action" });
      return false;
    }
  });

  // safety: ページ離脱時にクリーンアップ
  window.addEventListener("beforeunload", () => {
    try {
      deactivate();
    } catch (e) {}
  });
}
