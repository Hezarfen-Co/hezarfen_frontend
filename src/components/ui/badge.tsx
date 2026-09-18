import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ParentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex h-5 min-h-5 items-center rounded-full border px-2 text-xs font-semibold leading-none transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive/90 text-destructive-foreground",
        success: "border-transparent bg-success/15 text-success-text",
        warning: "border-transparent bg-warning/15 text-warning-text",
        info: "border-transparent bg-info/15 text-info-text",
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
