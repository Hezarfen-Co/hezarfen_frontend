import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export type LabelProps = ComponentProps<"label">;

export function Label(props: LabelProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <label
      class={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...rest}
    />
  );
}
