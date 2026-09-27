import { createEffect, onCleanup, onMount } from "solid-js";

/** The router's id for the current history entry (TanStack keeps it in `history.state`). */
function historyEntry(): string {
  const state = history.state as Record<string, unknown> | null;
  return String(state?.__TSR_key ?? state?.key ?? "");
}

/**
 * Put the page back where the reader left it when they return to the same
 * history entry (Back from a detail page). The router's own restoration runs
 * before a list's rows arrive, so it clamps to a short page and a long list
 * came back near the top. This remembers the window offset per entry and
 * re-applies it once `ready()` says the rows are drawn — never on a fresh
 * visit, which gets a new entry id.
 */
export function createScrollRestore(key: string | null, ready: () => boolean) {
  if (!key || typeof window === "undefined") return;
  const name = `scroll:${key}`;

  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        sessionStorage.setItem(name, JSON.stringify({ y: Math.round(window.scrollY), entry: historyEntry() }));
      } catch {
        // storage blocked: no restore, nothing else breaks
      }
    }, 150);
  };
  onMount(() => {
    window.addEventListener("scroll", save, { passive: true });
    onCleanup(() => {
      clearTimeout(saveTimer);
      window.removeEventListener("scroll", save);
    });
  });

  let restored = false;
  createEffect(() => {
    if (restored || !ready()) return;
    restored = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(name) ?? "null") as { y?: number; entry?: string } | null;
      const target = saved?.y;
      if (!target || saved.entry !== historyEntry()) return;
      // Correct once the rows are laid out, and once more after late content
      // (avatars, badges, images) settles.
      const settle = () => {
        if (Math.abs(window.scrollY - target) > 8) window.scrollTo(0, target);
      };
      requestAnimationFrame(settle);
      setTimeout(settle, 300);
    } catch {
      // malformed entry: start at the top
    }
  });
}
