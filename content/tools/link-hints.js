(function () {
  const tools = (globalThis.__zenBoostTools = globalThis.__zenBoostTools || {});
  tools["link-hints"] = {
    command: "link-hints",
    activate() {
      const utils = globalThis.__zenBoostUtils;
      if (!utils) {
        console.error("[ZenBoost] core.js not loaded — missing utilities");
        return;
      }

      const elements = utils.getInteractiveElements();
      if (elements.length === 0) {
        flashMessage("No interactive elements");
        return;
      }

      const hints = utils.generateHints(elements.length);
      const badgeMap = new Map();
      let typed = "";
      let deactivate;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const hint = hints[i];
        const rect = el.getBoundingClientRect();

        const badge = document.createElement("div");
        badge.className = "zb-badge active";
        badge.textContent = hint;
        badge.dataset.hint = hint;
        badge.style.left = `${rect.left}px`;
        badge.style.top = `${rect.top}px`;
        document.body.appendChild(badge);
        badgeMap.set(el, badge);
      }

      function handleKey(e) {
        const key = e.key;

        if (key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          deactivate();
          return;
        }

        if (key.length !== 1 || !/^[a-zA-Z]$/.test(key)) return;

        e.preventDefault();
        e.stopPropagation();
        typed += key.toUpperCase();

        let matchCount = 0;
        let lastMatchHint = "";

        for (const badge of badgeMap.values()) {
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
          deactivate();
          for (const [el, badge] of badgeMap) {
            if (badge.dataset.hint === typed) {
              el.click();
              break;
            }
          }
        }
      }

      document.addEventListener("keydown", handleKey, { capture: true });

      deactivate = function () {
        document.removeEventListener("keydown", handleKey, { capture: true });
        for (const badge of badgeMap.values()) {
          badge.remove();
        }
        badgeMap.clear();
        typed = "";
      };

      return deactivate;
    },
  };

  function flashMessage(text) {
    const el = document.createElement("div");
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
      fontSize: "0.875rem",
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
})();
