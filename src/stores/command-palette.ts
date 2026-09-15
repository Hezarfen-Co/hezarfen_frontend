import { createSignal } from "solid-js";

// The palette is mounted once by the shell, but its entry points live in
// pages (the dashboard hero field) and the mobile tab bar, so its open state
// is a module-level signal rather than a prop threaded through every layer.
const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);

export { commandPaletteOpen, setCommandPaletteOpen };

export function openCommandPalette() {
  setCommandPaletteOpen(true);
}
