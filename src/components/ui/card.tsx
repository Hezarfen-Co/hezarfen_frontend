import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export function Card(props: ParentProps<ComponentProps<"div">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div
      class={cn(
        "rounded-lg border border-border-line bg-surface-base text-card-foreground shadow-sm",
        local.class,
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

export function CardHeader(props: ParentProps<ComponentProps<"div">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex flex-col space-y-1.5 p-6", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export function CardTitle(props: ParentProps<ComponentProps<"h3">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <h3 class={cn("font-semibold leading-none tracking-tight", local.class)} {...rest}>
      {local.children}
    </h3>
  );
}

export function CardDescription(props: ParentProps<ComponentProps<"p">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <p class={cn("text-sm text-muted-foreground", local.class)} {...rest}>
      {local.children}
    </p>
  );
}

export function CardContent(props: ParentProps<ComponentProps<"div">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("p-6 pt-0", local.class)} {...rest}>
      {local.children}
    </div>
  );
}

export function CardFooter(props: ParentProps<ComponentProps<"div">>) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <div class={cn("flex items-center p-6 pt-0", local.class)} {...rest}>
      {local.children}
    </div>
  );
}
