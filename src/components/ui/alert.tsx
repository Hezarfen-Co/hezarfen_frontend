import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export function Alert(props: ParentProps<ComponentProps<"div"> & { variant?: "default" | "destructive" }>) {
  const [local, rest] = splitProps(props, ["class", "children", "variant"]);
  return (
    <div
      role="alert"
      class={cn(
        "relative w-full rounded-md border px-4 py-3 text-sm shadow-sm",
        local.variant === "destructive"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "bg-background text-foreground",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}
