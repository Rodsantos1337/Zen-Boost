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
      let tick = null;
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

      function repositionBadges() {
        if (tick) cancelAnimationFrame(tick);
        tick = requestAnimationFrame(() => {
          for (const [el, badge] of badgeMap) {
            const rect = el.getBoundingClientRect();
            if (utils.isVisible(el)) {
              badge.style.left = `${rect.left}px`;
              badge.style.top = `${rect.top}px`;
              badge.classList.remove("zb-hidden");
            } else {
              badge.classList.add("zb-hidden");
            }
          }
        });
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
          repositionBadges();
          flashMessage("No match");
          return;
        }

        if (matchCount === 1 && typed === lastMatchHint) {
          let isPrefix = false;
          for (const badge of badgeMap.values()) {
            const hint = badge.dataset.hint;
            if (hint !== typed && hint.startsWith(typed)) {
              isPrefix = true;
              break;
            }
          }

          if (!isPrefix) {
            let target = null;
            for (const [el, badge] of badgeMap) {
              if (badge.dataset.hint === typed) {
                target = el;
                break;
              }
            }
            deactivate();
            if (target) {
              try { target.click(); } catch (_) {}
            }
          }
        }
      }

      function onVisibilityChange() {
        if (document.hidden) deactivate();
      }

      window.addEventListener("scroll", repositionBadges, { passive: true });
      window.addEventListener("resize", repositionBadges, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      document.addEventListener("keydown", handleKey, { capture: true });

      const indicator = document.createElement("div");
      indicator.className = "zb-indicator";
      indicator.textContent = "[LINK-HINTS]";
      document.body.appendChild(indicator);

      deactivate = function () {
        window.removeEventListener("scroll", repositionBadges);
        window.removeEventListener("resize", repositionBadges);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        document.removeEventListener("keydown", handleKey, { capture: true });
        if (tick) cancelAnimationFrame(tick);
        for (const badge of badgeMap.values()) {
          badge.remove();
        }
        if (indicator.parentNode) indicator.remove();
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
