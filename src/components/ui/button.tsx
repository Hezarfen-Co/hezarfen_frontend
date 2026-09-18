import { Button as ButtonPrimitive } from "@kobalte/core/button";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, type ValidComponent, splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        // Flat (no shadows), neutral fills, subtle hairline outlines.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-border/70 bg-transparent hover:border-border hover:bg-muted/60 hover:text-foreground",
        secondary: "border border-border/60 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground/75 hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
        link: "text-primary-text underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 rounded-lg px-3 py-2",
        sm: "h-[26px] gap-1 rounded-md px-2 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps<T extends ValidComponent = "button"> = ComponentProps<
  typeof ButtonPrimitive<T>
> &
  VariantProps<typeof buttonVariants>;

export function Button<T extends ValidComponent = "button">(props: ButtonProps<T>) {
  const [local, rest] = splitProps(props as ButtonProps, ["class", "variant", "size"]);
  return (
    <ButtonPrimitive
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      {...rest}
    />
  );
}
