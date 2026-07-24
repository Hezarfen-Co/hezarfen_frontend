import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <textarea
      class={cn(
        "flex min-h-24 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5 text-sm shadow-xs transition-all duration-150 placeholder:text-muted-foreground/70 hover:bg-muted/50 hover:border-border focus:bg-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...rest}
    />
  );
}
