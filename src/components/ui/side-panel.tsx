import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ParentProps } from "solid-js";
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
        <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] dark:bg-black/60" />
        <DialogPrimitive.Content
          class={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-popover text-popover-foreground shadow-xl outline-none transition-transform duration-200",
            props.class,
          )}
        >
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <DialogPrimitive.Title class="font-display text-lg font-semibold leading-none">
                {props.title}
              </DialogPrimitive.Title>
              {props.description && (
                <DialogPrimitive.Description class="mt-1.5 text-sm text-muted-foreground">
                  {props.description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.CloseButton class="rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              ×
            </DialogPrimitive.CloseButton>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">{props.children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive>
  );
}
