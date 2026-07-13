import { Popover as PopoverPrimitive } from "@kobalte/core/popover";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const Popover = PopoverPrimitive;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export function PopoverContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof PopoverPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof PopoverPrimitive.Content>, [
    "class",
  ]);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn(
          "z-50 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          "origin-[var(--kb-popover-content-transform-origin)] animate-in fade-in-0 zoom-in-95",
          local.class,
        )}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  );
}
