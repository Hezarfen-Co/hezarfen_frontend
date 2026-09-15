import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import { createEffect, onCleanup, type ParentProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

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
  }>,
) {
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
    <DialogPrimitive open={props.open} onOpenChange={props.onOpenChange} modal={false} preventScroll>
      <DialogPrimitive.Portal>
        {/* z-[70]: above the mobile nav sheet (z-60) and tab bar (z-40). */}
        <DialogPrimitive.Overlay class="fixed inset-0 z-[70] bg-[rgba(13,15,23,0.55)] transition-opacity duration-200 data-closed:opacity-0 data-expanded:opacity-100" />
        <DialogPrimitive.Content
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
              aria-label="Close"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX class="h-4 w-4" />
            </DialogPrimitive.CloseButton>
          </div>
          <div class="side-panel-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-5">
            {props.children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
  );
}
