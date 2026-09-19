import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import { createEffect, createSignal, onCleanup, type ParentProps } from "solid-js";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

let openPanelCount = 0;

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
        >
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-border-hairline px-5 py-4">
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
      onConfirm={() => props.onOpenChange(false)}
    />
    </>
  );
}
