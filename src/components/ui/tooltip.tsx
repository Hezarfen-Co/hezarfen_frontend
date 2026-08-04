import { Tooltip as TooltipPrimitive } from "@kobalte/core/tooltip";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

// Kobalte's tooltip opens on hover and on keyboard focus, so a focusable
// trigger reaches keyboard users too. It is deliberately not a touch surface:
// anything a tooltip says must also be readable without it, since a tap can
// never open one.
export const Tooltip = TooltipPrimitive;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TooltipPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TooltipPrimitive.Content>, [
    "class",
  ]);
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        class={cn(
          "z-50 max-w-64 rounded-md border border-border/80 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl shadow-black/10",
          "origin-(--kb-tooltip-content-transform-origin) animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      />
    </TooltipPrimitive.Portal>
  );
}
