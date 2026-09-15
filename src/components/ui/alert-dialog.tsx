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
      {/* z-[70]: above the mobile nav sheet (z-60) and tab bar (z-40). */}
      <AlertDialogPrimitive.Overlay class="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm transition-opacity" />
      {/* Inset by the system bars — see dialog.tsx. pointer-events-none on the
          centering shell so outside taps reach the overlay/dismiss layer. */}
      <div class="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4 pb-[calc(1rem+max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <AlertDialogPrimitive.Content
          class={cn(
            "pointer-events-auto w-full max-w-md overflow-hidden border border-border/80 bg-background text-foreground shadow-2xl shadow-black/20 outline-hidden animate-fade-up sm:rounded-lg",
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
