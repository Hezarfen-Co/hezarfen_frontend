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
          "z-50 w-72 rounded-md border border-border/80 bg-popover p-4 text-popover-foreground shadow-xl shadow-black/10 outline-hidden",
          "origin-(--kb-popover-content-transform-origin) animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  );
}
