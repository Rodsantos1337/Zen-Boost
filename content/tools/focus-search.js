(function () {
  const tools = (globalThis.__zenBoostTools = globalThis.__zenBoostTools || {});
  tools["focus-search"] = {
    command: "focus-search",
    activate() {
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

      input.scrollIntoView({ block: "center" });
      input.focus();
      input.select();

      return function () {};
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
