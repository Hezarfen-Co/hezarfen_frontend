import { createSignal, onCleanup } from "solid-js";

// Surfaces that dock something at the bottom of a phone screen — the study
// chat's composer, the message compose sheet — put the floating action button
// away while they are up, the same way the shell's own overlays do. A count
// rather than a flag, so two holders never release each other's hold.
const [holds, setHolds] = createSignal(0);

export const quickActionsSuppressed = () => holds() > 0;

/**
 * Hide the phone quick-action button until the calling owner (component or
 * effect run) is disposed. Call it from a component body to hide for the
 * component's lifetime, or inside a `createEffect` branch to hide while a
 * condition holds.
 */
export function suppressQuickActions() {
  setHolds((count) => count + 1);
  onCleanup(() => setHolds((count) => count - 1));
}
