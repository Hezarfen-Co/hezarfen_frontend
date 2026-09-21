import { Index, Show, createEffect, createSignal, onCleanup, onMount, type Component } from "solid-js";
import { IconChevronLeft, IconChevronRight, IconPlus, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { clamp01, radialOffsets, readFloatingButton, writeFloatingButton } from "@/lib/floating-button";
import { useT } from "@/stores/preferences-context";

export interface FloatingAction {
  id: string;
  label: string;
  Icon: Component<{ class?: string }>;
  badge?: number;
  onSelect: () => void;
}

/** Button diameter. */
const SIZE = 56;
/** Gap the resting button keeps from the layer's edges. */
const MARGIN = 12;
/** Radial item diameter. */
const ITEM = 44;
/** Distance from the button centre to each radial item centre. */
const RADIUS = 84;
/** Movement under this is a tap, not a drag — a thumb is never perfectly still. */
const TAP_SLOP = 8;
/** How close the button centre has to come to the hide target to snap into it. */
const HIDE_REACH = 64;

const badgeText = (count: number) => (count > 9 ? "9+" : String(count));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The phone shell's floating action button, standing in for the desktop
 * header. Tapping it fans its actions out around it; dragging moves it
 * anywhere between the status bar and the tab bar; dropping it on the hide
 * target that rises while dragging parks it as a small tab on the nearest
 * side edge, and one tap on that tab brings it back where it was.
 *
 * Position and parked state are remembered per device (lib/floating-button).
 * Drag follows the pointer-event pattern of MobileNavSheet: pointer capture on
 * the button itself, touch-none so the browser does not claim the gesture for
 * scrolling.
 */
export function FloatingActionButton(props: {
  actions: FloatingAction[];
  /** Unread total shown on the button and, as a dot, on the parked tab. */
  badge: number;
  /** An overlay owns the screen; step aside without losing state. */
  hidden: boolean;
}) {
  const t = useT();
  const saved = readFloatingButton();
  const [pos, setPos] = createSignal({ x: saved.x, y: saved.y });
  const [parked, setParked] = createSignal(saved.parked);
  const [open, setOpen] = createSignal(false);
  const [bounds, setBounds] = createSignal({ w: 0, h: 0 });
  // Live top-left while a drag is under way; null at rest.
  const [drag, setDrag] = createSignal<{ left: number; top: number } | null>(null);
  const [overHide, setOverHide] = createSignal(false);

  let layer: HTMLDivElement | undefined;
  let fab: HTMLButtonElement | undefined;
  const measure = () => {
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    setBounds({ w: rect.width, h: rect.height });
  };
  onMount(() => {
    measure();
    window.addEventListener("resize", measure);
    onCleanup(() => window.removeEventListener("resize", measure));
  });

  const persist = () => writeFloatingButton({ ...pos(), parked: parked() });

  const travelX = () => Math.max(0, bounds().w - SIZE - 2 * MARGIN);
  const travelY = () => Math.max(0, bounds().h - SIZE - 2 * MARGIN);
  const restLeft = () => MARGIN + pos().x * travelX();
  const restTop = () => MARGIN + pos().y * travelY();
  const hideLeft = () => bounds().w / 2 - SIZE / 2;
  const hideTop = () => bounds().h - SIZE - MARGIN;
  const left = () => (overHide() ? hideLeft() : (drag()?.left ?? restLeft()));
  const top = () => (overHide() ? hideTop() : (drag()?.top ?? restTop()));

  createEffect(() => {
    if (props.hidden) setOpen(false);
  });
  createEffect(() => {
    if (!open()) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      fab?.focus();
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  let start: { x: number; y: number; left: number; top: number } | null = null;
  let moved = false;
  // A drag that ends over the button is followed by a click on mouse (not
  // always on touch), which must not toggle the menu. Reset on every press so
  // a swallowed click cannot leave the next real tap ignored.
  let suppressClick = false;

  const startDrag = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClick = false;
    moved = false;
    start = { x: event.clientX, y: event.clientY, left: left(), top: top() };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!moved) {
      moved = true;
      setOpen(false);
    }
    const next = {
      left: clamp(start.left + dx, 0, bounds().w - SIZE),
      top: clamp(start.top + dy, 0, bounds().h - SIZE),
    };
    setDrag(next);
    const hit = Math.hypot(next.left - hideLeft(), next.top - hideTop()) < HIDE_REACH;
    if (hit && !overHide()) navigator.vibrate?.(10);
    setOverHide(hit);
  };

  const endDrag = (commit: boolean) => {
    if (!start) return;
    start = null;
    if (!moved) return;
    suppressClick = true;
    const last = drag();
    if (commit && overHide()) {
      // Parked at the spot it was dragged from, so a tap on the tab puts it
      // back there rather than on the hide target.
      setParked(true);
      persist();
    } else if (commit && last) {
      setPos({
        x: travelX() ? clamp01((last.left - MARGIN) / travelX()) : pos().x,
        y: travelY() ? clamp01((last.top - MARGIN) / travelY()) : pos().y,
      });
      persist();
    }
    setDrag(null);
    setOverHide(false);
  };

  const toggle = () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setOpen(!open());
  };

  const restore = () => {
    setParked(false);
    persist();
  };

  const select = (action: FloatingAction) => {
    setOpen(false);
    action.onSelect();
  };

  const centreX = () => left() + SIZE / 2;
  const centreY = () => top() + SIZE / 2;
  const offsets = () =>
    radialOffsets(
      props.actions.length,
      bounds().w ? centreX() / bounds().w : 1,
      bounds().h ? centreY() / bounds().h : 1,
      RADIUS,
    );
  // Top-left of item i, kept inside the layer as a last resort for fans the
  // heading alone does not keep on screen.
  const itemPos = (i: number) => {
    const offset = offsets()[i] ?? { dx: 0, dy: 0 };
    return {
      left: clamp(centreX() + offset.dx - ITEM / 2, 4, bounds().w - ITEM - 4),
      top: clamp(centreY() + offset.dy - ITEM / 2, 4, bounds().h - ITEM - 4),
    };
  };
  const parkedRight = () => pos().x >= 0.5;
  const dragging = () => drag() !== null;

  return (
    <>
      <Show when={open()}>
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("nav.close")}
          class="fixed inset-0 z-50 cursor-default bg-black/25 lg:hidden"
          onClick={() => setOpen(false)}
        />
      </Show>

      {/* The layer spans the space between the status bar and the tab bar, so
          every position inside it is reachable and none hides under either.
          It stays mounted while hidden or parked to keep its measurements. */}
      <div
        ref={(el) => {
          layer = el;
        }}
        class={cn(
          "pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 transition-opacity duration-200 lg:hidden",
          "bottom-[calc(3.5rem+max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))]",
          props.hidden || !bounds().w ? "invisible opacity-0" : "visible opacity-100",
        )}
      >
        <Show when={dragging()}>
          <div class="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/30 to-transparent" />
          <div
            class="absolute flex flex-col items-center"
            style={{ left: `${hideLeft()}px`, top: `${hideTop()}px`, width: `${SIZE}px` }}
          >
            <span class="absolute -top-7 whitespace-nowrap rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground">
              {t("fab.hide")}
            </span>
            <span
              class={cn(
                "flex items-center justify-center rounded-full border-2 transition-all duration-150",
                overHide()
                  ? "h-[68px] w-[68px] -m-1.5 border-destructive bg-destructive text-destructive-foreground"
                  : "h-14 w-14 border-white/80 bg-black/40 text-white",
              )}
            >
              <IconX class="h-6 w-6" />
            </span>
          </div>
        </Show>

        <Show when={!parked()}>
          <div id="fab-actions" role="group" aria-label={t("fab.label")}>
            <Index each={props.actions}>
              {(action, i) => {
                const at = () => (open() ? itemPos(i) : { left: centreX() - ITEM / 2, top: centreY() - ITEM / 2 });
                return (
                  <button
                    type="button"
                    tabIndex={open() ? 0 : -1}
                    aria-hidden={open() ? undefined : "true"}
                    aria-label={action().label}
                    title={action().label}
                    class={cn(
                      "absolute left-0 top-0 flex items-center justify-center rounded-full border border-border bg-surface-base text-foreground shadow-lg outline-hidden",
                      "transition-[transform,opacity] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring",
                      open() ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                    )}
                    style={{
                      width: `${ITEM}px`,
                      height: `${ITEM}px`,
                      transform: `translate3d(${at().left}px, ${at().top}px, 0) scale(${open() ? 1 : 0.5})`,
                      "transition-delay": open() ? `${i * 30}ms` : "0ms",
                    }}
                    onClick={() => select(action())}
                  >
                    {(() => {
                      const Icon = action().Icon;
                      return <Icon class="h-5 w-5" />;
                    })()}
                    <Show when={(action().badge ?? 0) > 0}>
                      <span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
                        {badgeText(action().badge ?? 0)}
                      </span>
                    </Show>
                  </button>
                );
              }}
            </Index>
          </div>

          <button
            type="button"
            ref={(el) => {
              fab = el;
            }}
            aria-label={t("fab.label")}
            aria-expanded={open()}
            aria-controls="fab-actions"
            class={cn(
              "pointer-events-auto absolute left-0 top-0 flex touch-none select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 outline-hidden",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              dragging() && "shadow-xl",
              overHide() && "opacity-80",
            )}
            // Scale lives in the transform, after the translate: Tailwind's
            // scale-* sets the separate `scale` property, which applies after
            // `transform` and would scale the position along with the button.
            style={{
              width: `${SIZE}px`,
              height: `${SIZE}px`,
              transform: `translate3d(${left()}px, ${top()}px, 0) scale(${overHide() ? 0.9 : dragging() ? 1.05 : 1})`,
              transition: dragging() && !overHide() ? "none" : "transform 200ms ease-out, opacity 150ms",
            }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={() => endDrag(true)}
            onPointerCancel={() => endDrag(false)}
            onClick={toggle}
          >
            <IconPlus class={cn("h-6 w-6 transition-transform duration-200", open() && "rotate-45")} />
            <Show when={props.badge > 0 && !open()}>
              <span class="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground ring-2 ring-background">
                {badgeText(props.badge)}
              </span>
            </Show>
          </button>
        </Show>

        <Show when={parked()}>
          {/* Parked: a slim tab on the side the button rested nearest. The
              visible pill is narrow; the button around it is a full thumb
              target. */}
          <button
            type="button"
            aria-label={t("fab.restore")}
            title={t("fab.restore")}
            class={cn(
              "pointer-events-auto absolute flex h-14 w-8 items-center outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              parkedRight() ? "right-0 justify-end" : "left-0 justify-start",
            )}
            style={{ top: `${restTop()}px` }}
            onClick={restore}
          >
            <span
              class={cn(
                "relative flex h-12 w-4 items-center justify-center bg-foreground/35 text-background backdrop-blur-sm",
                parkedRight() ? "rounded-l-full" : "rounded-r-full",
              )}
            >
              {parkedRight() ? <IconChevronLeft class="h-3.5 w-3.5" /> : <IconChevronRight class="h-3.5 w-3.5" />}
              <Show when={props.badge > 0}>
                <span
                  class={cn(
                    "absolute -top-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background",
                    parkedRight() ? "left-0" : "right-0",
                  )}
                />
              </Show>
            </span>
          </button>
        </Show>
      </div>
    </>
  );
}
