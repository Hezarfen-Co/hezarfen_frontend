import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export function Alert(
  props: ParentProps<ComponentProps<"div"> & { variant?: "default" | "destructive" | "success" | "warning" | "info" }>,
) {
  const [local, rest] = splitProps(props, ["class", "children", "variant"]);
  return (
    <div
      role="alert"
      class={cn(
        "relative flex min-h-[70px] w-full items-center rounded-lg border px-5 py-4 text-sm",
        local.variant === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
        local.variant === "success" && "border-success/30 bg-success/10 font-medium text-success",
        local.variant === "warning" && "border-warning/30 bg-warning/10 font-medium text-warning",
        local.variant === "info" && "border-info/30 bg-info/10 font-medium text-info",
        (!local.variant || local.variant === "default") && "border-border-line bg-surface-base text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
