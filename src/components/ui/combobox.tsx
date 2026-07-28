import { Combobox as ComboboxPrimitive } from "@kobalte/core/combobox";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { IconCheck, IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export const Combobox = ComboboxPrimitive;
export const ComboboxItemLabel = ComboboxPrimitive.ItemLabel;
export const ComboboxHiddenSelect = ComboboxPrimitive.HiddenSelect;

export function ComboboxControl<T extends ValidComponent = "div">(
  props: ComponentProps<typeof ComboboxPrimitive.Control<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Control>, ["class"]);
  return (
    <ComboboxPrimitive.Control
      class={cn(
        "relative flex h-11 w-full items-center rounded-xl border border-black/8 dark:border-white/12 bg-card transition-all duration-150",
        "focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        local.class,
      )}
      {...rest}
    />
  );
}

export function ComboboxInput<T extends ValidComponent = "input">(
  props: ComponentProps<typeof ComboboxPrimitive.Input<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Input>, ["class"]);
  return (
    <ComboboxPrimitive.Input
      class={cn(
        "flex h-full min-w-0 flex-1 bg-transparent pl-3.5 pr-1 text-xs font-medium text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed",
        local.class,
      )}
      {...rest}
    />
  );
}

export function ComboboxTrigger<T extends ValidComponent = "button">(
  props: ComponentProps<typeof ComboboxPrimitive.Trigger<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Trigger>, ["class"]);
  return (
    <ComboboxPrimitive.Trigger
      class={cn("flex h-full shrink-0 items-center pr-3 pl-1 text-muted-foreground/70 outline-hidden", local.class)}
      {...rest}
    >
      <ComboboxPrimitive.Icon>
        <IconChevronDown class="h-4 w-4" />
      </ComboboxPrimitive.Icon>
    </ComboboxPrimitive.Trigger>
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
  const [local, rest] = splitProps(props as ComponentProps<typeof ComboboxPrimitive.Item>, ["class", "children"]);
  return (
    <ComboboxPrimitive.Item
      class={cn(
        "relative flex min-h-10 cursor-pointer select-none items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-hidden transition-all duration-150",
        "data-highlighted:bg-primary/10 data-highlighted:text-primary active:scale-[0.98] data-disabled:pointer-events-none data-disabled:opacity-40",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <ComboboxPrimitive.ItemIndicator>
        <IconCheck class="h-3.5 w-3.5 shrink-0 text-primary" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}
