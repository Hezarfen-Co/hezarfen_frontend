import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ParentProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function SidePanel(props: ParentProps<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  class?: string;
}>) {
  return (
    <DialogPrimitive open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/25 backdrop-blur-[1px] dark:bg-black/55" />
        <DialogPrimitive.Content
          class={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-[34rem] flex-col border-l border-border/80 bg-background text-foreground shadow-[0_20px_70px_hsl(var(--foreground)/0.18)] outline-none transition-transform duration-200 sm:inset-y-3 sm:right-3 sm:rounded-2xl sm:border sm:border-border/80",
            props.class,
          )}
        >
          <div class="flex items-start justify-between gap-4 border-b border-border/80 bg-card px-6 py-5 sm:rounded-t-2xl">
            <div class="min-w-0 space-y-1">
              <DialogPrimitive.Title class="truncate font-display text-base font-semibold leading-6 tracking-tight">
                {props.title}
              </DialogPrimitive.Title>
              {props.description && (
                <DialogPrimitive.Description class="text-sm leading-5 text-muted-foreground">
                  {props.description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.CloseButton class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <IconX class="h-4 w-4" />
            </DialogPrimitive.CloseButton>
          </div>
          <div class="side-panel-body min-h-0 flex-1 overflow-y-auto bg-muted/20 px-6 pt-5">{props.children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
  );
}
