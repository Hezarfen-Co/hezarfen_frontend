import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import { createEffect, createSignal, onCleanup, type ParentProps } from "solid-js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAlert, IconMaximize, IconMinimize, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

let openPanelCount = 0;

/** Width the user dragged or expanded a panel to; one value for every panel. */
const WIDTH_KEY = "hezarfen.sidePanel.width";
const MIN_WIDTH = 360;
/** Room kept free on the left so the page behind still reads as "behind". */
const PAGE_GUTTER = 64;
const EXPANDED_WIDTH = 1120;

const maxPanelWidth = () => (typeof window === "undefined" ? EXPANDED_WIDTH : Math.max(MIN_WIDTH, window.innerWidth - PAGE_GUTTER));
const clampWidth = (value: number) => Math.round(Math.min(Math.max(value, MIN_WIDTH), maxPanelWidth()));
const readStoredWidth = (): number | null => {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};
const storeWidth = (value: number | null) => {
  try {
    if (value == null) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(value));
  } catch {
    // Private mode: the width lasts for this page only.
  }
};

export function SidePanel(
  props: ParentProps<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    class?: string;
    /** default ~34rem, wide ~42rem, xl ~48rem — for report tables */
    size?: "default" | "wide" | "xl";
    bodyClass?: string;
    /**
     * The form inside holds unsaved input. Escape, an outside click or the
     * close button then ask before discarding it; a submit or an explicit
     * Cancel that sets `open` directly is not asked.
     */
    dirty?: boolean;
    /**
     * Treat any input or change inside the panel as unsaved work, for forms
     * that keep their state to themselves. Ignored when `dirty` is given.
     * Leave it off for panels whose controls save as you go.
     */
    guardUnsaved?: boolean;
  }>,
) {
  const t = useT();
  const [confirmDiscard, setConfirmDiscard] = createSignal(false);
  const [touched, setTouched] = createSignal(false);
  createEffect(() => {
    if (props.open) setTouched(false);
  });
  const isDirty = () => props.dirty ?? (!!props.guardUnsaved && touched());
  const markTouched = () => {
    if (props.guardUnsaved) setTouched(true);
  };
  const requestOpenChange = (open: boolean) => {
    // A press inside the confirm dialog reads as an outside interaction to
    // this non-modal panel; while the dialog is up it owns the decision.
    if (!open && confirmDiscard()) return;
    if (!open && isDirty()) return setConfirmDiscard(true);
    props.onOpenChange(open);
  };

  // Kobalte's modal Dialog hides the app with aria-hidden before its focus
  // scope can move focus into this portalled panel. Chromium correctly blocks
  // that transition when the opener still owns focus. `inert` makes the app
  // unfocusable as well as hidden to assistive tech, while the portal remains
  // interactive outside #root.
  createEffect(() => {
    if (!props.open || typeof document === "undefined") return;
    const root = document.getElementById("root");
    openPanelCount += 1;
    root?.setAttribute("inert", "");
    onCleanup(() => {
      openPanelCount -= 1;
      if (openPanelCount === 0) root?.removeAttribute("inert");
    });
  });

  const width = () => {
    if (props.size === "xl") return "max-w-[min(48rem,100vw)]";
    if (props.size === "wide") return "max-w-[min(42rem,100vw)]";
    return "max-w-[min(34rem,100vw)]";
  };

  // A user-chosen width, dragged from the left edge or set by the expand
  // button, overrides the size preset on screens wide enough to have a page
  // beside the panel. Phones keep the full-screen panel.
  const [customWidth, setCustomWidth] = createSignal<number | null>(readStoredWidth());
  const roomyQuery = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 640px)") : null;
  const [roomy, setRoomy] = createSignal(roomyQuery()?.matches ?? false);
  createEffect(() => {
    if (!props.open) return;
    const query = roomyQuery();
    if (!query) return;
    const sync = () => setRoomy(query.matches);
    sync();
    query.addEventListener("change", sync);
    onCleanup(() => query.removeEventListener("change", sync));
  });
  const appliedWidth = () => {
    const value = customWidth();
    return roomy() && value != null ? clampWidth(value) : null;
  };
  const expanded = () => (appliedWidth() ?? 0) >= clampWidth(EXPANDED_WIDTH) - 8;
  const setWidth = (value: number | null) => {
    setCustomWidth(value == null ? null : clampWidth(value));
    storeWidth(value == null ? null : clampWidth(value));
  };
  const toggleExpanded = () => setWidth(expanded() ? null : EXPANDED_WIDTH);
  const startResize = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // No active pointer to capture (synthetic events); moves still arrive.
    }
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "col-resize";
    const move = (moveEvent: PointerEvent) => setCustomWidth(clampWidth(window.innerWidth - moveEvent.clientX));
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      document.body.style.cursor = previousCursor;
      storeWidth(customWidth());
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };
  const resizeByKey = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 80 : 24;
    const current = appliedWidth() ?? (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect().width ?? MIN_WIDTH;
    if (event.key === "ArrowLeft") setWidth(current + step);
    else if (event.key === "ArrowRight") setWidth(current - step);
    else if (event.key === "Home") setWidth(null);
    else return;
    event.preventDefault();
  };

  return (
    <>
    <DialogPrimitive open={props.open} onOpenChange={requestOpenChange} modal={false} preventScroll>
      <DialogPrimitive.Portal>
        {/* z-[70]: above the mobile nav sheet (z-60) and tab bar (z-40). */}
        <DialogPrimitive.Overlay class="fixed inset-0 z-[70] bg-[rgba(13,15,23,0.55)] transition-opacity duration-200 data-closed:opacity-0 data-expanded:opacity-100" />
        <DialogPrimitive.Content
          // Explicit: with any AlertDialog in the tree (the discard confirm
          // below), Kobalte hands plain dialogs its "alertdialog" role too.
          role="dialog"
          // A row-actions menu that opened this panel is still animating out
          // when the panel mounts, and focus passing through it (or back to
          // its trigger in the inert app) read as leaving the panel, which
          // closed it at once — "Notlandır"/"Görüntüle" seemed to do nothing.
          // Focus moving to another dialog still closes the panel, which the
          // edit/delete flows opened from inside a panel rely on.
          onFocusOutside={(event) => {
            const target = (event as CustomEvent<{ originalEvent?: FocusEvent }>).detail?.originalEvent?.target;
            if (!(target instanceof Element)) return;
            if (target.closest('[role="menu"]') || document.getElementById("root")?.contains(target)) event.preventDefault();
          }}
          class={cn(
            "fixed inset-y-0 right-0 z-[70] flex h-full w-full flex-col border-l border-border-line bg-surface-base text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.16)] outline-hidden",
            // The panel spans the whole display, so it has to keep its own
            // header out from under the status bar and its footer off the
            // gesture bar. Both insets are 0 in a desktop browser.
            "pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))]",
            "transition-[transform,opacity] duration-200 ease-out data-closed:translate-x-full data-closed:opacity-0 data-expanded:translate-x-0 data-expanded:opacity-100",
            width(),
            props.class,
          )}
          style={appliedWidth() != null ? { width: `${appliedWidth()}px`, "max-width": "100vw" } : undefined}
        >
          <div class="flex shrink-0 items-start justify-between gap-2 border-b border-border-hairline px-5 py-4">
            <div class="min-w-0 flex-1 space-y-1">
              <DialogPrimitive.Title class="truncate text-base font-semibold leading-6 tracking-tight">
                {props.title}
              </DialogPrimitive.Title>
              {props.description && (
                <DialogPrimitive.Description class="line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {props.description}
                </DialogPrimitive.Description>
              )}
            </div>
            <button
              type="button"
              aria-label={expanded() ? t("sidePanel.collapse") : t("sidePanel.expand")}
              title={expanded() ? t("sidePanel.collapse") : t("sidePanel.expand")}
              class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
              onClick={toggleExpanded}
            >
              {expanded() ? <IconMinimize class="h-4 w-4" /> : <IconMaximize class="h-4 w-4" />}
            </button>
            <DialogPrimitive.CloseButton
              type="button"
              aria-label={t("common.close")}
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX class="h-4 w-4" />
            </DialogPrimitive.CloseButton>
          </div>
          <div
            class={cn(
              "side-panel-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5",
              // Short forms should still use the full panel height so their
              // actions settle at the bottom instead of floating above empty space.
              "[&>form]:flex [&>form]:min-h-full [&>form]:flex-col [&>form>div:last-child]:mt-auto",
              props.bodyClass,
            )}
            onInput={markTouched}
            onChange={markTouched}
          >
            {props.children}
          </div>
          {/* Drag the left edge to resize; double-click or Home resets. Last in
              the DOM so opening the panel does not focus it first. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("sidePanel.resize")}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={maxPanelWidth()}
            aria-valuenow={appliedWidth() ?? undefined}
            tabIndex={0}
            class="group/resize absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-hidden sm:block"
            onPointerDown={startResize}
            onDblClick={() => setWidth(null)}
            onKeyDown={resizeByKey}
          >
            <span class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover/resize:bg-primary/60 group-focus-visible/resize:bg-primary" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
    <ConfirmDialog
      open={confirmDiscard()}
      onOpenChange={setConfirmDiscard}
      title={t("sidePanel.discardTitle")}
      summary={t("sidePanel.discardSummary")}
      confirmLabel={t("sidePanel.discard")}
      cancelLabel={t("sidePanel.keepEditing")}
      variant="destructive"
      // Discarding a draft is not deleting a record: no trash can.
      icon={<IconAlert class="h-4 w-4" />}
      onConfirm={() => props.onOpenChange(false)}
    />
    </>
  );
}
