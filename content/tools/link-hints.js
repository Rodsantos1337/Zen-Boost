(function () {
  const tools = (globalThis.__zenBoostTools = globalThis.__zenBoostTools || {});
  tools["link-hints"] = {
    command: "link-hints",
    activate() {
      console.log("[ZenBoost] link-hints activated");
      return function deactivate() {
        console.log("[ZenBoost] link-hints deactivated");
      };
    },
  };
})();
