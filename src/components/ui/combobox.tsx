import { Combobox as ComboboxPrimitive } from "@kobalte/core/combobox";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const Combobox = ComboboxPrimitive;
export const ComboboxTrigger = ComboboxPrimitive.Control;
export const ComboboxDisclosure = ComboboxPrimitive.Trigger;

export function ComboboxInput<T extends ValidComponent = "input">(
  props: ComponentProps<typeof ComboboxPrimitive.Input<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Input>, ["class"]);
  return (
    <ComboboxPrimitive.Input
      class={cn(
        "flex h-11 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2 text-sm text-foreground shadow-xs outline-hidden transition-all duration-150",
        "placeholder:text-muted-foreground hover:bg-muted/50 hover:border-border focus:bg-background focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...rest}
    />
  );
}

export function ComboboxContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof ComboboxPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Content>, [
    "class",
    "children",
  ]);
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Content
        class={cn(
          "z-50 mt-1.5 max-h-72 min-w-(--kb-popper-anchor-width) overflow-hidden rounded-2xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl p-1.5 text-popover-foreground shadow-apple outline-hidden",
          "origin-(--kb-combobox-content-transform-origin) animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      >
        {local.children ?? <ComboboxPrimitive.Listbox class="max-h-64 overflow-y-auto" />}
      </ComboboxPrimitive.Content>
    </ComboboxPrimitive.Portal>
  );
}

export function ComboboxItem<T extends ValidComponent = "li">(
  props: ComponentProps<typeof ComboboxPrimitive.Item<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Item>, ["class"]);
  return (
    <ComboboxPrimitive.Item
      class={cn(
        "relative flex min-h-10 cursor-pointer select-none items-center rounded-xl px-3 py-2 text-sm font-medium outline-hidden transition-all duration-150",
        "data-highlighted:bg-primary/10 data-highlighted:text-primary active:scale-[0.98] data-disabled:pointer-events-none data-disabled:opacity-40",
        local.class,
      )}
      {...rest}
    />
  );
}
