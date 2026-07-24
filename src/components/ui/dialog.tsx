import { Dialog as DialogPrimitive } from "@kobalte/core/dialog";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.CloseButton;

export function DialogContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DialogPrimitive.Content<T>> & { dismissable?: boolean },
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DialogPrimitive.Content> & { dismissable?: boolean }, [
    "class",
    "children",
    "dismissable",
  ]);
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity duration-200 dark:bg-black/60" />
      {/* flex center — animate-fade-up must not own transform positioning */}
      <div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        <DialogPrimitive.Content
          class={cn(
            "pointer-events-auto relative flex max-h-[min(90vh,48rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-black/8 bg-popover/95 text-popover-foreground shadow-apple outline-hidden backdrop-blur-xl animate-fade-up dark:border-white/12 sm:rounded-3xl",
            local.class,
          )}
          // Default: close only via X — outside/ESC races with clickable cards underneath.
          // Opt into backdrop/ESC dismissal per-dialog with `dismissable`.
          onPointerDownOutside={local.dismissable ? undefined : (e) => e.preventDefault()}
          onInteractOutside={local.dismissable ? undefined : (e) => e.preventDefault()}
          onEscapeKeyDown={local.dismissable ? undefined : (e) => e.preventDefault()}
          {...rest}
        >
          <DialogPrimitive.CloseButton
            type="button"
            class="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/8 bg-background text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground active:scale-[0.96] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring dark:border-white/12"
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
  return <div class={cn("border-b border-black/6 bg-card/80 px-5 py-4 pr-14 backdrop-blur-xl dark:border-white/8 sm:px-6", props.class)}>{props.children}</div>;
}

export function DialogBody(props: ParentProps<{ class?: string }>) {
  return <div class={cn("overflow-y-auto bg-muted/20 px-5 py-4 sm:px-6", props.class)}>{props.children}</div>;
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
