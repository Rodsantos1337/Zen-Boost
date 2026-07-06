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
      const hints = utils.generateHints(elements.length);

      if (elements.length === 0) {
        console.log("[ZenBoost] link-hints activated — no interactive elements found");
        return;
      }

      console.log(
        `[ZenBoost] link-hints activated — ${elements.length} elements, first hints:`,
        hints.slice(0, 5)
      );

      return function deactivate() {
        console.log("[ZenBoost] link-hints deactivated");
      };
    },
  };
})();
