import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type InputProps = ComponentProps<"input">;

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <input
      class={cn(
        "flex h-9 w-full rounded-md border border-input bg-surface-base px-3 py-1 text-base shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-text-placeholder hover:border-ring/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:border-destructive aria-invalid:ring-destructive disabled:cursor-not-allowed disabled:bg-surface-tint disabled:text-muted-foreground disabled:opacity-70 md:text-sm",
        local.class,
      )}
      {...rest}
    />
  );
}
