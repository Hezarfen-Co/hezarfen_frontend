import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
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
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <DialogPrimitive.Content
          class={cn(
            "flex max-h-[min(90vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-popover text-popover-foreground shadow-md outline-none animate-fade-up",
            local.class,
          )}
          {...rest}
        >
          {local.children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader(props: ParentProps<{ class?: string }>) {
  return <div class={cn("border-b border-border px-5 py-4", props.class)}>{props.children}</div>;
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
