import { onCleanup } from "solid-js";

/**
 * Visibility-aware polling primitive. Call inside a component/owner scope.
 *
 * Why this exists: a plain `setInterval(refetch, ms)` keeps firing in hidden
 * tabs (wasted GETs) and never catches up when the user returns — so state
 * changed by *another* actor (e.g. a teacher approving a student's appointment)
 * shows up to one full interval stale on a parked tab. This runs the interval
 * only while the tab is visible, and refetches immediately when the tab becomes
 * visible or the window regains focus, so tab-back is instant-fresh.
 *
 * Pair with `resource.latest` reads (see AGENTS.md #6): a refetch never
 * re-suspends, so the poll can't blank a shell that sits beside <Outlet>.
 *
 * @param refetch  called on each visible tick and on visibility/focus wake.
 * @param intervalMs  poll period while visible (default 30s).
 */
export function createLivePoll(refetch: () => unknown, intervalMs = 30_000): void {
  let timer: ReturnType<typeof setInterval> | undefined;
  let lastRun = 0;
  const run = () => {
    lastRun = Date.now();
    void refetch();
  };
  const start = () => {
    if (!timer) timer = setInterval(run, intervalMs);
  };
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  // visibilitychange (tab switch) and window focus can both fire on tab-back;
  // the 1s guard collapses that into a single refetch.
  const wake = () => {
    if (document.hidden) {
      stop();
      return;
    }
    if (Date.now() - lastRun > 1_000) run();
    start();
  };

  if (!document.hidden) start();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("focus", wake);
  onCleanup(() => {
    stop();
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("focus", wake);
  });
}
