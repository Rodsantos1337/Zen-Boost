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

function injectZenBoostStyles() {
  if (document.getElementById("zen-boost-styles")) return;

  const style = document.createElement("style");
  style.id = "zen-boost-styles";
  style.textContent = `
    .zb-badge {
      all: unset;
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Inter, "Helvetica Neue", Arial, sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
      padding: 0.1em 0.35em;
      border-radius: 0.25rem;
      background: #374145;
      color: #d3c6aa;
      border: 1px solid #374145;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      user-select: none;
      transition: opacity 80ms ease;
      opacity: 1;
    }
    .zb-badge.active {
      border-color: #a7c080;
    }
    .zb-badge.inactive {
      opacity: 0.15;
    }
  `;
  document.head.appendChild(style);
}

injectZenBoostStyles();

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
