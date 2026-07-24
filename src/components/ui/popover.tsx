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
          "z-50 rounded-2xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl p-2 text-popover-foreground shadow-apple outline-hidden",
          "origin-(--kb-popover-content-transform-origin) animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  );
}
