import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <textarea
      class={cn(
        "flex min-h-15 w-full rounded-md border border-input bg-background/90 px-3 py-2 text-base shadow-sm transition-all placeholder:text-muted-foreground/80 hover:border-ring/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        local.class,
      )}
      {...rest}
    />
  );
}
