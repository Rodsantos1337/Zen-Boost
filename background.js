const TOOL_MAP = {
  "link-hints": "link-hints",
};

chrome.commands.onCommand.addListener(async (command) => {
  const tool = TOOL_MAP[command];
  if (!tool) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { tool }).catch((err) => {
    console.error("[ZenBoost] Failed to send message:", err);
  });
});
