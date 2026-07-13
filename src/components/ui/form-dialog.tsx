import { Dialog } from "@kobalte/core/dialog";
import type { JSX } from "solid-js";
import { cn } from "@/lib/cn";

export function FormDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: JSX.Element;
  class?: string;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 dark:bg-black/60" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <Dialog.Content
            class={cn(
              "flex max-h-[min(90vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-md outline-none animate-fade-up",
              props.class,
            )}
          >
            <div class="border-b border-border px-5 py-4">
              <Dialog.Title class="font-display text-lg font-semibold leading-none">
                {props.title}
              </Dialog.Title>
              {props.description && (
                <Dialog.Description class="mt-1.5 text-sm text-muted-foreground">
                  {props.description}
                </Dialog.Description>
              )}
            </div>
            <div class="overflow-y-auto px-5 py-4">
              {props.children}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
