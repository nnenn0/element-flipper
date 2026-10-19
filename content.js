console.log("Element Flipper: content script loaded");

if (window.elementFlipperLoaded) {
  console.log("Element Flipper already loaded");
} else {
  window.elementFlipperLoaded = true;

  let isActive = false;
  let highlightedEl = null;
  const originalTransforms = new WeakMap();

  function setHighlight(el) {
    if (highlightedEl && highlightedEl !== el) {
      try {
        highlightedEl.style.outline = "";
      } catch (e) {}
      highlightedEl = null;
    }
    if (el && el !== highlightedEl) {
      highlightedEl = el;
      try {
        highlightedEl.style.outline = "3px solid red";
      } catch (e) {}
    }
  }

  // pointermove を使ってマウス下の要素を拾う（安定）
  function onPointerMove(e) {
    if (!isActive) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
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
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    console.log("Element Flipper activated");
  }

  function deactivate() {
    if (!isActive) return;
    isActive = false;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeyDown, true);
    // ハイライトを消す
    if (highlightedEl) {
      try {
        highlightedEl.style.outline = "";
      } catch (e) {}
      highlightedEl = null;
    }
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
