const activeTools = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message.tool) return;

  if (activeTools.has(message.tool)) {
    const deactivate = activeTools.get(message.tool);
    deactivate();
    activeTools.delete(message.tool);
  }

  const tools = globalThis.__zenBoostTools || {};
  const tool = tools[message.tool];

  if (!tool) {
    console.error(`[ZenBoost] Unknown tool: "${message.tool}"`);
    return;
  }

  if (typeof tool.activate !== "function") {
    console.error(`[ZenBoost] Tool "${message.tool}" has no activate function`);
    return;
  }

  const deactivate = tool.activate({});
  if (typeof deactivate === "function") {
    activeTools.set(message.tool, deactivate);
  }

  return true;
});
