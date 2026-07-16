import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.CloseButton;

export function DialogContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DialogPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DialogPrimitive.Content>, [
    "class",
    "children",
  ]);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/40 dark:bg-black/60" />
      {/* flex center — animate-fade-up must not own transform positioning */}
      <div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <DialogPrimitive.Content
          class={cn(
            "pointer-events-auto relative flex max-h-[min(90vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-md outline-none animate-fade-up",
            local.class,
          )}
          // ponytail: close only via X — outside/ESC races with clickable cards underneath
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          {...rest}
        >
          <DialogPrimitive.CloseButton
            type="button"
            class="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <IconX class="h-4 w-4" />
          </DialogPrimitive.CloseButton>
          {local.children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader(props: ParentProps<{ class?: string }>) {
  return <div class={cn("border-b border-border px-5 py-4 pr-14", props.class)}>{props.children}</div>;
}

export function DialogBody(props: ParentProps<{ class?: string }>) {
  return <div class={cn("overflow-y-auto px-5 py-4", props.class)}>{props.children}</div>;
}

export function DialogTitle<T extends ValidComponent = "h2">(
  props: ComponentProps<typeof DialogPrimitive.Title<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DialogPrimitive.Title>, ["class"]);
  return (
    <DialogPrimitive.Title
      class={cn("font-display text-lg font-semibold leading-none", local.class)}
      {...rest}
    />
  );
}

export function DialogDescription<T extends ValidComponent = "p">(
  props: ComponentProps<typeof DialogPrimitive.Description<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DialogPrimitive.Description>, ["class"]);
  return (
    <DialogPrimitive.Description
      class={cn("mt-1.5 text-sm text-muted-foreground", local.class)}
      {...rest}
    />
  );
}
