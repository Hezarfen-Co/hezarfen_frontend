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
        "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors",
        "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
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
          "z-50 mt-1 max-h-72 min-w-[var(--kb-popper-anchor-width)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          "origin-[var(--kb-combobox-content-transform-origin)] animate-in fade-in-0 zoom-in-95",
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
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...rest}
    />
  );
}
