const HINT_CHARSET = "ASDFGHJKL";

function encodeHint(index) {
  const base = HINT_CHARSET.length;
  let result = "";
  let n = index;
  do {
    result = HINT_CHARSET[n % base] + result;
    n = Math.floor(n / base) - 1;
  } while (n >= 0);
  return result;
}

function generateHints(count) {
  const hints = [];
  for (let i = 0; i < count; i++) {
    hints.push(encodeHint(i));
  }
  return hints;
}

const INTERACTIVE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input[type='submit']:not([disabled])",
  "input[type='button']:not([disabled])",
  "[role='button']:not([disabled])",
  "[onclick]",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "summary",
];

function isVisible(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function getInteractiveElements(root) {
  root = root || document;
  const elements = [];
  const seen = new WeakSet();

  for (const selector of INTERACTIVE_SELECTORS) {
    const found = root.querySelectorAll(selector);
    for (const el of found) {
      if (!seen.has(el) && isVisible(el)) {
        seen.add(el);
        elements.push(el);
      }
    }
  }

  return elements;
}

globalThis.__zenBoostUtils = {
  generateHints,
  getInteractiveElements,
  isVisible,
};

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
