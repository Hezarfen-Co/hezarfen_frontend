import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.CloseButton;

export function DialogContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DialogPrimitive.Content<T>> & { dismissable?: boolean; closeButton?: boolean },
) {
  const [local, rest] = splitProps(
    props as ComponentProps<typeof DialogPrimitive.Content> & { dismissable?: boolean; closeButton?: boolean },
    ["class", "children", "dismissable", "closeButton"],
  );
  return (
    <DialogPrimitive.Portal>
      {/* z-[70]: above the mobile nav sheet (z-60) and tab bar (z-40). */}
      <DialogPrimitive.Overlay class="fixed inset-0 z-[70] bg-[rgba(13,15,23,0.55)] transition-opacity duration-200" />
      {/* flex center — animate-fade-up must not own transform positioning */}
      {/* The centring box is inset by the system bars, so a tall dialog is
          never clipped by the status bar or the gesture bar. */}
      <div class="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-3 pb-[calc(0.75rem+max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:p-4">
        <DialogPrimitive.Content
          // Explicit: with any AlertDialog in the tree, Kobalte hands plain
          // dialogs its "alertdialog" role too.
          role="dialog"
          class={cn(
            "pointer-events-auto relative flex max-h-[min(100%,48rem)] w-full max-w-[480px] flex-col overflow-hidden border border-border-line bg-surface-base text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.16)] outline-hidden animate-fade-up sm:rounded-2xl",
            local.class,
          )}
          // Standard dialogs dismiss outside/ESC; pass false only when losing
          // unsaved state would be unsafe.
          onPointerDownOutside={local.dismissable === false ? (e) => e.preventDefault() : undefined}
          onInteractOutside={local.dismissable === false ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={local.dismissable === false ? (e) => e.preventDefault() : undefined}
          {...rest}
        >
          {/* `closeButton={false}` lets a dialog draw its own close control
              (the command palette labels it, beside its clear-search ×). */}
          <Show when={local.closeButton !== false}>
          <DialogPrimitive.CloseButton
            type="button"
            class="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <IconX class="h-4 w-4" />
          </DialogPrimitive.CloseButton>
          </Show>
          {local.children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader(props: ParentProps<{ class?: string }>) {
  return <div class={cn("flex flex-col space-y-1.5 border-b border-border-hairline px-5 py-5 pr-14 text-center sm:px-7 sm:text-left", props.class)}>{props.children}</div>;
}

export function DialogBody(props: ParentProps<{ class?: string }>) {
  return <div class={cn("overflow-y-auto overscroll-contain px-5 py-5 sm:px-7", props.class)}>{props.children}</div>;
}

export function DialogTitle<T extends ValidComponent = "h2">(
  props: ComponentProps<typeof DialogPrimitive.Title<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DialogPrimitive.Title>, ["class"]);
  return (
    <DialogPrimitive.Title
      class={cn("text-lg font-semibold leading-none tracking-tight", local.class)}
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
