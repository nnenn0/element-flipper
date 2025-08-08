document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("flipButton");

  button.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab || !tab.id) return;

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      await chrome.tabs.sendMessage(tab.id, { action: "activate" });

      window.close();
    } catch (e) {
      console.error("Element Flipper failed:", e);
    }
  });
});
