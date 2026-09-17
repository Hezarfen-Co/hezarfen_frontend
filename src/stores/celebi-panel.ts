import { createSignal } from "solid-js";

// The Çelebi panel is mounted once by the shell, but it is opened from the
// sidebar entry, the command palette and the AI hub page, so its open state is
// a module-level signal rather than a prop threaded through every layer —
// same arrangement as the command palette.
const [celebiPanelOpen, setCelebiPanelOpen] = createSignal(false);

export { celebiPanelOpen, setCelebiPanelOpen };

export function openCelebiPanel() {
  setCelebiPanelOpen(true);
}
