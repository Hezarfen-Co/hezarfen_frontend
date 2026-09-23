import { createSignal, onCleanup } from "solid-js";

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

// Ancestor styles that turn an ancestor into the containing block of a
// `position: fixed` child (a SidePanel's slide-in `translate`, for one) and
// would trap the CSS fallback overlay inside it. Neutralised while it is up.
const TRAPPING_STYLES = ["transform", "translate", "scale", "rotate", "filter", "backdrop-filter", "perspective", "contain", "will-change"] as const;

const fullscreenElement = () => {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};

/**
 * Full-screen state for one element. Uses the Fullscreen API (with the webkit
 * prefix for Safari) where the browser offers it on arbitrary elements; iPhone
 * Safari does not, so there `active()` still flips and the host renders itself
 * as a fixed, inset-0 overlay instead (`native()` tells the two apart). Either
 * way the host styles itself off `active()`.
 *
 * Escape and the host's toggle exit. While active, an Escape keydown is
 * swallowed in the capture phase so it doesn't also reach a surrounding
 * Kobalte dialog (a SidePanel would otherwise close with the drawing in it).
 */
export function createFullscreen(target: () => HTMLElement | undefined) {
  const [active, setActive] = createSignal(false);
  const [native, setNative] = createSignal(false);
  let restore: (() => void) | undefined;

  const pinOverlay = (el: HTMLElement) => {
    const saved: Array<[HTMLElement, string, string, string]> = [];
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      // A dialog's entry animation (fill-mode both) keeps a transform "in effect"
      // after it finishes, and Chromium still treats that as a containing block
      // even under an !important override. Its end state is the resting layout,
      // so cancelling it changes nothing visible.
      for (const anim of node.getAnimations?.() ?? []) anim.cancel();
      for (const prop of TRAPPING_STYLES) {
        saved.push([node, prop, node.style.getPropertyValue(prop), node.style.getPropertyPriority(prop)]);
        node.style.setProperty(prop, prop === "will-change" ? "auto" : "none", "important");
      }
    }
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      for (const [node, prop, value, priority] of saved) node.style.setProperty(prop, value, priority);
      root.style.overflow = overflow;
    };
  };

  const enter = async () => {
    const el = target() as FsElement | undefined;
    if (!el || active()) return;
    const request = el.requestFullscreen ?? el.webkitRequestFullscreen;
    if (request && (document.fullscreenEnabled ?? true)) {
      try {
        await request.call(el);
        setNative(true);
        setActive(true);
        return;
      } catch {
        // Refused (no gesture, iframe policy…) — fall through to the overlay.
      }
    }
    restore = pinOverlay(el);
    setNative(false);
    setActive(true);
  };

  const exit = async () => {
    if (!active()) return;
    if (native()) {
      const d = document as FsDocument;
      if (fullscreenElement()) {
        const leave = d.exitFullscreen ?? d.webkitExitFullscreen;
        try {
          await leave?.call(d);
        } catch {
          // Already left; the change listener below settles the state.
        }
      }
    } else {
      restore?.();
      restore = undefined;
    }
    setNative(false);
    setActive(false);
  };

  const toggle = () => void (active() ? exit() : enter());

  // When the browser itself leaves native full screen on Escape, Chromium can
  // still hand that same keydown to the page *after* fullscreenchange — by then
  // active() is false and the Escape would close the dialog around the canvas.
  let leftNativeAt = -Infinity;
  const ESC_GRACE_MS = 500;

  // The browser leaves native full screen on its own (Escape, a system gesture).
  const onChange = () => {
    if (native() && fullscreenElement() !== target()) {
      leftNativeAt = performance.now();
      setNative(false);
      setActive(false);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (!active() && performance.now() - leftNativeAt > ESC_GRACE_MS) return;
    e.preventDefault();
    e.stopPropagation();
    void exit();
  };
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  window.addEventListener("keydown", onKey, true);
  onCleanup(() => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
    window.removeEventListener("keydown", onKey, true);
    void exit();
  });

  return { active, native, enter, exit, toggle };
}

/** Classes a host adds to its root while `active()` — covers the viewport in both modes. */
export const FULLSCREEN_ROOT_CLASS =
  "fixed inset-0 z-[100] m-0 flex flex-col gap-2 space-y-0 bg-background p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]";
