document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("flipButton");
  const status = document.getElementById("status");

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.hidden = true;
    let stage = "tab";
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error("Active tab is unavailable");

      stage = "inject";
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      stage = "activate";
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "activate",
      });
      if (!response?.success) throw new Error(response?.error || "Activation failed");

      window.close();
    } catch (e) {
      console.error("Element Flipper failed:", e);
      const messages = {
        tab: "対象のタブを取得できませんでした。Webページを開いて、もう一度試してください。",
        inject:
          "このページでは選択モードを開始できません。通常のWebページを開くか、ページを再読み込みして試してください。",
        activate:
          "ページとの接続に失敗しました。ページを再読み込みして、もう一度試してください。",
      };
      status.textContent = messages[stage];
      status.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
});
