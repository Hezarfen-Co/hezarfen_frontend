import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring/70 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive/90 text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = ParentProps<
  ComponentProps<"div"> & VariantProps<typeof badgeVariants>
>;

export function Badge(props: BadgeProps) {
  const [local, rest] = splitProps(props, ["class", "variant", "children"]);
  return (
    <div class={cn(badgeVariants({ variant: local.variant }), local.class)} {...rest}>
      {local.children}
    </div>
  );
}
