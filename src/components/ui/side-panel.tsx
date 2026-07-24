import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ParentProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

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
  const width = () => {
    if (props.size === "xl") return "max-w-[min(48rem,100vw)]";
    if (props.size === "wide") return "max-w-[min(42rem,100vw)]";
    return "max-w-[min(34rem,100vw)]";
  };

  return (
    <DialogPrimitive open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity duration-200 data-closed:opacity-0 data-expanded:opacity-100" />
        <DialogPrimitive.Content
          class={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-black/8 dark:border-white/12 bg-background text-foreground shadow-apple outline-hidden",
            "sm:inset-y-3 sm:right-3 sm:h-auto sm:max-h-[calc(100vh-1.5rem)] sm:rounded-3xl sm:border",
            "transition-[transform,opacity] duration-200 ease-out data-closed:translate-x-full data-closed:opacity-0 data-expanded:translate-x-0 data-expanded:opacity-100",
            width(),
            props.class,
          )}
        >
          <div class="flex shrink-0 items-start justify-between gap-4 border-b border-black/6 dark:border-white/8 bg-card/90 backdrop-blur-xl px-5 py-4 sm:rounded-t-3xl sm:px-6 sm:py-5">
            <div class="min-w-0 flex-1 space-y-1">
              <DialogPrimitive.Title class="truncate font-display text-base font-semibold leading-6 tracking-tight">
                {props.title}
              </DialogPrimitive.Title>
              {props.description && (
                <DialogPrimitive.Description class="line-clamp-2 text-sm leading-5 text-muted-foreground">
                  {props.description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.CloseButton class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/8 dark:border-white/12 bg-background text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
              <IconX class="h-4 w-4" />
            </DialogPrimitive.CloseButton>
          </div>
          <div class="side-panel-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/20 px-5 py-5 sm:px-6 sm:pb-6">
            {props.children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
  );
}
