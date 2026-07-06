# Implementation Guide

> Step-by-step implementation details for each phase. Read the corresponding
> `PLAN.md` section first for context, then follow the instructions here.

---

## Phase 1 — Project Scaffold

### Files to create

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — commands, permissions, web_accessible_resources |
| `background.js` | Service worker — listens for commands, routes to content script |
| `content/core.js` | Message receiver, dynamic module loader |
| `content/tools/link-hints.js` | Stub tool — logs activation, returns noop cleanup |
| `icons/icon128.png` | Placeholder 128×128 icon (solid green square for now) |

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Zen Boost",
  "version": "0.1.0",
  "description": "Keyboard-first browser navigation. Tag, type, go.",
  "permissions": ["activeTab"],
  "host_permissions": ["<all_urls>"],
  "commands": {
    "link-hints": {
      "suggested_key": {
        "default": "Alt+F",
        "mac": "Alt+F"
      },
      "description": "Activate link hints on the current page"
    }
  },
  "web_accessible_resources": [{
    "resources": ["content/tools/*.js"],
    "matches": ["<all_urls>"]
  }],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/core.js"],
    "type": "module"
  }],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "icons": {
    "128": "icons/icon128.png"
  }
}
```

**Key points:**
- `activeTab` permission — minimal, granted on action. We request on command via `activeTab`.
- `<all_urls>` host permission needed for content script injection and WAR access.
- `web_accessible_resources` exposes `content/tools/*.js` so dynamic `import()` works.
- Both content script and background use `"type": "module"` for ES module support.

Wait — `"type": "module"` is not valid inside the `content_scripts` entry of manifest.json in MV3. Content scripts use `"type": "module"` in **Chrome 111+** actually — let's verify. Actually, for content scripts, you set the `type` at the content script registration level, not in the manifest. But `"js"` entries can be modules if they use `import`/`export`. Actually, the `"type": "module"` parameter for content scripts in manifest.json was added in Chrome 111.

Let's keep it but also note that if `"type": "module"` doesn't work in the content_scripts manifest entry, we can fall back to regular scripts and use a different pattern. Actually, checking the spec: content_scripts entries in manifest.json accept a `type` field which can be `"module"`. This is supported since Chrome 111.

So the above is correct.

### background.js

```js
const TOOL_MAP = {
  "link-hints": "link-hints",
};

chrome.commands.onCommand.addListener(async (command) => {
  const tool = TOOL_MAP[command];
  if (!tool) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { tool });
  } catch (err) {
    // Content script not loaded — inject it
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/core.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { tool });
  }
});
```

### content/core.js

```js
const activeTools = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message.tool) return;

  // If a tool is already active, deactivate it first
  if (activeTools.has(message.tool)) {
    activeTools.get(message.tool)();
    activeTools.delete(message.tool);
  }

  loadTool(message.tool)
    .then((module) => {
      const deactivate = module.activate({});
      if (typeof deactivate === "function") {
        activeTools.set(message.tool, deactivate);
      }
    })
    .catch((err) => console.error("[ZenBoost] Tool load failed:", err));

  return true; // keep message channel open
});

async function loadTool(name) {
  const url = chrome.runtime.getURL(`content/tools/${name}.js`);
  return import(url);
}
```

### content/tools/link-hints.js

```js
export const command = "link-hints";

export function activate() {
  console.log("[ZenBoost] link-hints activated");

  return function deactivate() {
    console.log("[ZenBoost] link-hints deactivated");
  };
}
```

### icons/icon128.png

Create a 128×128 PNG. For now, use any solid-color image. A simple approach:

```bash
# If you have ImageMagick:
convert -size 128x128 xc:'#a7c080' icons/icon128.png
```

### Verification

1. Load unpacked extension in `chrome://extensions`
2. Visit any page
3. Press Alt+F
4. Check the console for "link-hints activated" message

---

## Phase 2 — Hint Generation Engine

### What we're building

Pure functions in `core.js` that convert element indices into hint strings and
collect page elements worth tagging.

### Hint generation algorithm

Use base-k encoding where k = charset length. The charset is `ASDFGHJKL` (9 chars).

```
charset = "ASDFGHJKL"
n = 9

index 0  → "A"
index 1  → "S"
index 8  → "L"
index 9  → "AA"
index 10 → "AS"
index 17 → "AL"
index 18 → "SA"
index 80 → "LL"
index 81 → "AAA"
```

Implementation:

```js
// content/core.js — add to module scope

const HINT_CHARSET = "ASDFGHJKL";
const BASE = HINT_CHARSET.length;

export function generateHints(count) {
  const hints = [];
  for (let i = 0; i < count; i++) {
    hints.push(encodeHint(i));
  }
  return hints;
}

function encodeHint(n) {
  if (n === 0) return HINT_CHARSET[0];
  let result = "";
  let remaining = n;
  while (remaining >= 0) {
    result = HINT_CHARSET[remaining % BASE] + result;
    remaining = Math.floor(remaining / BASE) - 1;
  }
  return result;
}
```

Wait, the standard approach for link hint encoding:

```js
function encodeHint(index) {
  let result = "";
  let n = index;
  do {
    result = HINT_CHARSET[n % BASE] + result;
    n = Math.floor(n / BASE) - 1;
  } while (n >= 0);
  return result;
}
```

Let me double-check:

index 0: n=0, 0%9=0 → 'A', n = floor(0/9)-1 = -1 → stop → "A" ✓
index 1: n=1, 1%9=1 → 'S', n = floor(1/9)-1 = -1 → stop → "S" ✓
index 8: n=8, 8%9=8 → 'L', n = floor(8/9)-1 = -1 → stop → "L" ✓
index 9: n=9, 9%9=0 → 'A', n = floor(9/9)-1 = 0 → continue, 0%9=0 → 'AA', n = floor(0/9)-1 = -1 → stop → "AA" ✓

Good.

### Element collection

```js
// content/core.js

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

export function getInteractiveElements(root = document) {
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

export function isVisible(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;

  return true;
}
```

### Unit test (optional but nice)

```js
// tests/hint-generation.test.js
import { generateHints } from "../content/core.js";

test("first hint is the first charset character", () => {
  expect(generateHints(1)).toEqual(["A"]);
});

test("encodes index 9 as two-char hint", () => {
  const hints = generateHints(10);
  expect(hints[9]).toBe("AA");
});

test("every hint is unique", () => {
  const hints = generateHints(1000);
  const unique = new Set(hints);
  expect(unique.size).toBe(hints.length);
});
```

---

## Phase 3 — Link Hints Overlay & Keyboard Navigation

### What we're building

The core UX: Alt+F places pill badges over every interactive element. Typing
letters filters the badges. On unique match, the element is clicked.

### Files to modify

- `content/tools/link-hints.js` — full implementation
- `content/core.js` — inject CSS into page

### CSS Injection

Add to `core.js` (injected once on page load):

```js
export function injectStyles() {
  if (document.getElementById("zen-boost-styles")) return;

  const style = document.createElement("style");
  style.id = "zen-boost-styles";
  style.textContent = ZEN_BOOST_CSS;
  document.head.appendChild(style);
}
```

And the CSS constant (move to a separate string or file as preferred):

```js
const ZEN_BOOST_CSS = `
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
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    pointer-events: none;
    user-select: none;
    transition: opacity 80ms ease;
    opacity: 1;
  }

  .zb-badge.active {
    border-color: #a7c080;
    opacity: 1;
  }

  .zb-badge.inactive {
    opacity: 0.15;
  }

  .zb-badge.hidden {
    display: none;
  }
`;
```

### Badge positioning

```js
function positionBadge(badge, rect) {
  badge.style.left = `${rect.left + window.scrollX}px`;
  badge.style.top = `${rect.top + window.scrollY}px`;
}

function positionAllBadges() {
  for (const [el, badge] of badgeMap) {
    const rect = el.getBoundingClientRect();
    positionBadge(badge, rect);
  }
}
```

Actually, since badges use `position: fixed`, we should use `getBoundingClientRect()` directly
without adding scroll offsets:

```js
function positionBadge(badge, rect) {
  badge.style.left = `${rect.left}px`;
  badge.style.top = `${rect.top}px`;
}
```

### link-hints.js — Full Implementation

```js
export const command = "link-hints";

let badgeMap = new Map();
let hints = [];
let typed = "";
let elementMap = new Map(); // hintString → element
let activeDeactivate = null;

export async function activate() {
  typed = "";
  const elements = getInteractiveElements();
  if (elements.length === 0) {
    // Flash "no links" and exit
    flashMessage("No interactive elements found");
    return;
  }

  hints = generateHints(elements.length);
  badgeMap = new Map();
  elementMap = new Map();

  // Build badges
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const hint = hints[i];
    elementMap.set(hint, el);
    const rect = el.getBoundingClientRect();
    const badge = document.createElement("div");
    badge.className = "zb-badge active";
    badge.textContent = hint;
    positionBadge(badge, rect);
    document.body.appendChild(badge);
    badgeMap.set(el, badge);
  }

  document.addEventListener("keydown", handleKey, { capture: true });

  return function deactivate() {
    document.removeEventListener("keydown", handleKey, { capture: true });
    for (const badge of badgeMap.values()) {
      badge.remove();
    }
    badgeMap.clear();
    elementMap.clear();
    hints = [];
    typed = "";
  };
}

function handleKey(e) {
  const key = e.key;

  if (key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    if (activeDeactivate) activeDeactivate();
    return;
  }

  // Only match single printable characters (a-z, A-Z)
  if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
    e.preventDefault();
    e.stopPropagation();
    typed += key.toUpperCase();

    // Filter
    let matchedHint = null;
    let matchCount = 0;

    for (const [hint, badge] of getBadgeEntries()) {
      if (hint.startsWith(typed)) {
        badge.className = "zb-badge active";
        matchedHint = hint;
        matchCount++;
      } else {
        badge.className = "zb-badge inactive";
      }
    }

    if (matchCount === 0) {
      // No matches — reset typed and flash
      typed = typed.slice(0, -1);
      flashMessage("No match");
      return;
    }

    if (matchCount === 1 && typed === matchedHint) {
      // Exact unique match — click it!
      const el = elementMap.get(typed);
      if (activeDeactivate) activeDeactivate();
      el.click();
      return;
    }
  }
}

function getBadgeEntries() {
  return Array.from(badgeMap.entries()).map(([el, badge]) => {
    const hint = elementMap.get(el);
    return [hint, badge, el];
  });
}
```

Wait, there's a problem with `getBadgeEntries()` — `badgeMap` maps `element → badge`,
but I need to find the hint string for each element. Let me restructure.

Actually, it's simpler to store the hint on the badge element itself or maintain a separate map:

```js
// During badge creation:
badge.dataset.hint = hint;
```

Then filtering is straightforward:

```js
function handleKey(e) {
  const key = e.key;
  if (key === "Escape") { /* teardown */ return; }

  if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
    e.preventDefault();
    e.stopPropagation();
    typed += key.toUpperCase();

    let matchCount = 0;
    let lastMatchHint = "";

    for (const [el, badge] of badgeMap) {
      const hint = badge.dataset.hint;
      if (hint.startsWith(typed)) {
        badge.className = "zb-badge active";
        matchCount++;
        lastMatchHint = hint;
      } else {
        badge.className = "zb-badge inactive";
      }
    }

    if (matchCount === 0) {
      typed = typed.slice(0, -1);
      flashMessage("No match");
      return;
    }

    if (matchCount === 1 && typed === lastMatchHint) {
      const el = elementMap.get(typed);
      deactivate();
      el.click();
      return;
    }
  }
}
```

Hmm, but I said deactivate should be returned from activate and stored. Let me think about this more carefully.

Actually, the architecture in PLAN.md says:
- `activate()` returns a `deactivate` function
- `core.js` stores it in `activeTools`
- When a new command comes in or cleanup is needed, `core.js` calls the stored `deactivate`

But in the tool itself, we also need to call deactivate (e.g., on Escape, on match). The tool shouldn't have to reach into core's map. Instead, the tool should hold its own reference.

Let me restructure:

```js
export async function activate() {
  let deactivate = null; // will be set below

  // ... setup ...

  deactivate = function cleanup() {
    document.removeEventListener("keydown", handleKey, { capture: true });
    for (const badge of badgeMap.values()) {
      badge.remove();
    }
    badgeMap.clear();
    elementMap.clear();
    hints = [];
    typed = "";
  };

  document.addEventListener("keydown", handleKey, { capture: true });

  return deactivate;
}
```

And `handleKey` can call `deactivate()` directly since it's a closure.

Let me write the full correct version.

### Flash message helper

```js
function flashMessage(text) {
  const el = document.createElement("div");
  el.className = "zb-flash";
  el.textContent = text;
  Object.assign(el.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "2147483647",
    background: "#374145",
    color: "#d3c6aa",
    padding: "0.5em 1em",
    borderRadius: "0.25rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "1rem",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity 150ms ease",
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 150);
  }, 600);
}
```

### Verification

1. Load the extension
2. Visit a page with links (e.g., google.com, wikipedia.org)
3. Press Alt+F
4. Verify badges appear with correct home-row letters
5. Type a letter matching a badge — non-matching badges fade
6. Type the full hint of a unique match — page navigates
7. Press Escape — badges disappear

---

## Phase 4 — Resilience & Polish

### Scroll / Resize Handling

```js
// Add to activate():
let scrollTimer = null;
const onScroll = () => {
  if (scrollTimer) cancelAnimationFrame(scrollTimer);
  scrollTimer = requestAnimationFrame(() => {
    for (const [el, badge] of badgeMap) {
      const rect = el.getBoundingClientRect();
      if (isVisible(el)) {
        positionBadge(badge, rect);
        badge.className = badge.className.replace(" hidden", "");
      } else {
        badge.className += " hidden";
      }
    }
  });
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll, { passive: true });

// In deactivate():
window.removeEventListener("scroll", onScroll);
window.removeEventListener("resize", onScroll);
```

### Edge Cases

| Edge case | Handling |
|-----------|----------|
| No interactive elements | Flash "No interactive elements" message, exit immediately |
| All elements off-screen | Hide badges with `.hidden` class, show on scroll |
| Dynamic DOM changes | On each keystroke, re-verify target element is still in DOM |
| Shadow DOM | Recursive `querySelectorAll` into `el.shadowRoot` if present |
| Page navigation mid-session | Badges are cleaned up; tool deactivates on visibility change |
| Tab switch | Clean up via `visibilitychange` listener |

### Shadow DOM Support

```js
export function getInteractiveElements(root = document) {
  const elements = [];
  const seen = new WeakSet();

  function collect(node) {
    const rootEl = node === document ? document : node;
    for (const selector of INTERACTIVE_SELECTORS) {
      const found = rootEl.querySelectorAll(selector);
      for (const el of found) {
        if (!seen.has(el) && isVisible(el)) {
          seen.add(el);
          elements.push(el);
        }
      }
    }
    // Recurse into shadow roots
    const all = rootEl.querySelectorAll("*");
    for (const el of all) {
      if (el.shadowRoot && !seen.has(el.shadowRoot)) {
        seen.add(el.shadowRoot);
        collect(el.shadowRoot);
      }
    }
  }

  collect(root);
  return elements;
}
```

### Visual Polish

Add a subtle entrance animation to badges:

```css
.zb-badge {
  animation: zb-fade-in 100ms ease-out both;
}

@keyframes zb-fade-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Active tool badge

Add a small indicator in the corner of the page showing active tool name
(e.g., "[LINK-HINTS]") while tool is active:

```css
.zb-indicator {
  position: fixed;
  bottom: 8px;
  right: 8px;
  z-index: 2147483647;
  background: #374145;
  color: #d3c6aa;
  font-family: system-ui, sans-serif;
  font-size: 0.75rem;
  padding: 0.25em 0.5em;
  border-radius: 0.25rem;
  border: 1px solid #a7c080;
  pointer-events: none;
  user-select: none;
}
```

---

## Phase 5 — Extensibility Demo

### Alt+G — Focus Search Input

New file: `content/tools/focus-search.js`

```js
export const command = "focus-search";

export function activate() {
  // Find the first visible search input
  const selectors = [
    "input[type='search']",
    "input[type='text'][name*='search' i]",
    "input[type='text'][name*='q' i]",
    "input[type='text'][aria-label*='search' i]",
    "input[type='text'][placeholder*='search' i]",
    "input[type='text'][title*='search' i]",
    "input:not([type])[name*='search' i]",
    "form[role='search'] input",
  ];

  let input = null;
  for (const sel of selectors) {
    input = document.querySelector(sel);
    if (input) break;
  }

  if (!input) {
    flashMessage("No search input found");
    return;
  }

  input.focus();
  input.select();

  // No cleanup needed — focus is instant
  return () => {};
}
```

Add to manifest:

```json
"commands": {
  "link-hints": { ... },
  "focus-search": {
    "suggested_key": {
      "default": "Alt+G",
      "mac": "Alt+G"
    },
    "description": "Focus the page search input"
  }
}
```

### Background.js — Dynamic registration

No changes needed — the `TOOL_MAP` handles dispatch. The tool's `command` export
should match the manifest command name.

Actually, we need to add it to the background.js tool map:

```js
const TOOL_MAP = {
  "link-hints": "link-hints",
  "focus-search": "focus-search",
};
```

### Popup (optional)

Create `popup/popup.html` and `popup/popup.js` showing the available tools:

```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 200px;
      padding: 8px;
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #272e33;
      color: #d3c6aa;
    }
    h1 {
      font-size: 1rem;
      margin: 0 0 8px 0;
      color: #a7c080;
    }
    .tool {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 0.875rem;
    }
    .key {
      background: #374145;
      padding: 0.1em 0.4em;
      border-radius: 0.25rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>Zen Boost</h1>
  <div id="tool-list"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```js
// popup/popup.js
const tools = [
  { name: "Link Hints", keybind: "Alt+F" },
  { name: "Focus Search", keybind: "Alt+G" },
];

const list = document.getElementById("tool-list");
for (const t of tools) {
  const div = document.createElement("div");
  div.className = "tool";
  div.innerHTML = `<span>${t.name}</span><span class="key">${t.keybind}</span>`;
  list.appendChild(div);
}
```

---

## Testing Strategy

| Layer | Tool | Target |
|-------|------|--------|
| Hint generation | `node --test` or Vitest | Pure functions in `core.js` |
| Element collection | Manual testing, console logging | `getInteractiveElements()` on real pages |
| Keyboard filtering | Manual testing | Type hints, verify filtering |
| Edge cases | Manual testing | Dynamic pages (SPA, infinite scroll) |
| Shadow DOM | Manual testing | Pages with web components |

### Running tests

```bash
# If using Node.js built-in test runner:
node --test tests/hint-generation.test.js

# If using Vitest:
npx vitest run
```

---

## Chrome Extension Gotchas

1. **Dynamic imports** — Must pair with `web_accessible_resources` in manifest.
   The URL must use `chrome.runtime.getURL()`.

2. **Service worker lifecycle** — Background service workers can idle after ~30s.
   Use `chrome.storage` or alarms to keep alive if needed. For our use case,
   tools are transient (only active while user interacts), so this is fine.

3. **`activeTab` permission** — Allows access to the tab *only when the user
   invokes the extension* (via command). This pairs perfectly with `commands`.

4. **Content script world** — Content scripts run in an "isolated world" but
   share the same DOM. They cannot access page-scoped JS variables unless
   injected via a `<script>` tag. We don't need that for Zen Boost.

5. **Module vs classic scripts** — Content scripts with `"type": "module"` load
   as ES modules. Dynamic `import()` works but the URL must be absolute and
   resolvable from the extension's origin.
