import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export function Alert(
  props: ParentProps<ComponentProps<"div"> & { variant?: "default" | "destructive" | "success" }>,
) {
  const [local, rest] = splitProps(props, ["class", "children", "variant"]);
  return (
    <div
      role="alert"
      class={cn(
        "relative w-full rounded-lg border px-3.5 py-2.5 text-xs shadow-2xs transition-all",
        local.variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive font-medium",
        local.variant === "success" && "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium",
        (!local.variant || local.variant === "default") && "bg-muted/40 text-foreground border-border/80",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
