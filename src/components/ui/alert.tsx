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
        "relative w-full rounded-md border px-4 py-3 text-sm shadow-sm",
        local.variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
        local.variant === "success" && "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
        (!local.variant || local.variant === "default") && "bg-background text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
