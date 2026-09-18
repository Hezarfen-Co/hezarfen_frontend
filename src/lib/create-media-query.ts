import { createSignal, onCleanup } from "solid-js";

/**
 * A signal that follows a CSS media query. False where `matchMedia` is
 * missing (tests, very old browsers), so callers fall back to the desktop
 * layout.
 */
export function createMediaQuery(query: string): () => boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => false;
  const list = window.matchMedia(query);
  const [matches, setMatches] = createSignal(list.matches);
  const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
  list.addEventListener("change", onChange);
  onCleanup(() => list.removeEventListener("change", onChange));
  return matches;
}
