import { AlertDialog as AlertDialogPrimitive } from "@kobalte/core/alert-dialog";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const AlertDialog = AlertDialogPrimitive;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogCancel = AlertDialogPrimitive.CloseButton;

export function AlertDialogContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof AlertDialogPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof AlertDialogPrimitive.Content>, [
    "class",
    "children",
  ]);
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity" />
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <AlertDialogPrimitive.Content
          class={cn(
            "w-full max-w-md overflow-hidden rounded-2xl sm:rounded-3xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl text-popover-foreground shadow-apple outline-hidden animate-fade-up",
            local.class,
          )}
          {...rest}
        >
          {local.children}
        </AlertDialogPrimitive.Content>
      </div>
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogHeader(props: ParentProps<{ class?: string }>) {
  return <div class={cn("flex gap-3 border-b border-border px-5 py-4", props.class)}>{props.children}</div>;
}

export function AlertDialogBody(props: ParentProps<{ class?: string }>) {
  return <div class={cn("space-y-2 px-5 py-4", props.class)}>{props.children}</div>;
}

export function AlertDialogFooter(props: ParentProps<{ class?: string }>) {
  return <div class={cn("flex items-center justify-end gap-2 border-t border-border px-5 py-3", props.class)}>{props.children}</div>;
}

export function AlertDialogTitle<T extends ValidComponent = "h2">(
  props: ComponentProps<typeof AlertDialogPrimitive.Title<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof AlertDialogPrimitive.Title>, ["class"]);
  return (
    <AlertDialogPrimitive.Title
      class={cn("text-base font-semibold leading-none", local.class)}
      {...rest}
    />
  );
}

export function AlertDialogDescription<T extends ValidComponent = "p">(
  props: ComponentProps<typeof AlertDialogPrimitive.Description<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof AlertDialogPrimitive.Description>, ["class"]);
  return (
    <AlertDialogPrimitive.Description
      class={cn("text-sm text-muted-foreground", local.class)}
      {...rest}
    />
  );
}
