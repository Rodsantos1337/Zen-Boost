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
