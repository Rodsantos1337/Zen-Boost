# Zen Boost — Plan

> A keyboard-first browser extension for navigating and interacting with web pages
> without touching the mouse. Built as a modular tool framework for Chrome (MV3).

---

## Vision

Zen Boost provides keyboard shortcuts that overlay interactive tags on the page,
letting you click links, focus inputs, and perform actions by typing short letter
sequences. The architecture is built around a plug-in tool system so new keyboard
superpowers can be added without touching existing code.

---

## Architecture

```
zen-boost/
├── manifest.json              # MV3 manifest — commands, permissions, WAR
├── background.js              # Service worker: onCommand → message router
├── content/
│   ├── core.js                # Module loader, shared utilities, CSS injection
│   └── tools/
│       ├── link-hints.js      # Phase 3 — Alt+F link navigation
│       └── focus-search.js    # Phase 5 — Alt+G focus search input
├── popup/                     # Phase 5+ — tool list & settings
│   ├── popup.html
│   └── popup.js
├── icons/
│   └── icon128.png
├── PLAN.md
└── IMPLEMENT.md
```

### Data Flow

```
User presses Alt+F
  → chrome.commands.onCommand fires in background.js
  → background.js calls chrome.tabs.sendMessage({ tool: "link-hints" })
  → content/core.js receives message
  → core.js dynamically imports content/tools/link-hints.js
  → tool.activate() runs:
      1. collect interactive elements (a[href], button, etc.)
      2. generate hint strings from element indices
      3. overlay pill-shaped badges on each element
      4. listen for keydown events
      5. each keystroke filters the hints, toggling .active / .inactive
      6. on unique match → click the element
      7. on Escape → deactivate everything
  → tool.activate() returns a cleanup function
```

### Tool Contract

Every tool module in `content/tools/` must export:

| Export | Type | Description |
|--------|------|-------------|
| `command` | `string` | Matches the `chrome.commands` name in manifest.json |
| `activate` | `(tab: TabInfo) => Promise<CleanupFn>` | Called when the command fires. Returns a deactivation function. |

```js
// Template for any new tool:
export const command = "my-command";

export async function activate(tab) {
  // setup logic
  return function deactivate() {
    // teardown logic
  };
}
```

---

## Theme — Everforest Dark Hard

All UI overlays follow the [Everforest Dark Hard](https://github.com/sainnhe/everforest)
palette defined in `theme.json`.

| Token | Hex | Usage |
|-------|-----|-------|
| `bg2` | `#374145` | Badge background |
| `fg` | `#d3c6aa` | Badge text (letter) |
| `green` | `#a7c080` | Active badge border/glow |
| `grey0` | `#7a8478` | Inactive badge text |
| `bg_dim` | `#1e2326` | Badge shadow/backdrop |

### Badge Visual spec

```
┌────────────────────────┐
│  font: system stack     │
│  size: 0.875rem         │
│  bg: bg2 (#374145)      │
│  text: fg (#d3c6aa)    │
│  radius: 0.25rem        │
│  padding: 0.1em 0.35em  │
│  border: 1px solid bg2  │
│  Active: border green   │
│  Inactive: opacity 0.2  │
└────────────────────────┘
```

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hint charset | `ASDFGHJKL` (home row) | Minimal finger travel while typing hints |
| Match behavior | Auto-click on unique match | Speed — matches Vimium UX |
| Second tool | Alt+G → Focus search input | Simple, useful, proves extensibility |
| Module loading | Dynamic `import()` + `web_accessible_resources` | Clean ES module architecture |
| Content script loading | Core only on page load; tools lazy-imported | Minimal overhead on every page |
| Badge border radius | `0.25rem` | Subtle pill shape, matches theme aesthetic |
| Badge font size | `0.875rem` | Readable without obscuring page content |
| Font stack | System fonts → Inter (Google Fonts) | System-first, graceful fallback |
| Active highlight | Green border (`#a7c080`) | Everforest green — visible, thematic |

---

## Implementation Phases

| Phase | Focus | Commit Message |
|-------|-------|----------------|
| **1** | Project scaffold — manifest, background, core loader, tool stub | `feat: project scaffold with modular tool architecture` |
| **2** | Hint generation engine — pure logic, no DOM | `feat: hint generation engine for link tagging` |
| **3** | Link hints overlay, keyboard filtering, navigation | `feat: link hints overlay with keyboard navigation` |
| **4** | Resilience — scroll, resize, error states, polish | `feat: scroll handling, edge cases, and visual polish` |
| **5** | Extensibility demo — focus-search tool, popup | `feat: focus-search tool demonstrating extensible framework` |

See `IMPLEMENT.md` for phase-by-phase implementation details.
