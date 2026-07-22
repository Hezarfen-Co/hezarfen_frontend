import { Button as ButtonPrimitive } from "@kobalte/core/button";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, type ValidComponent, splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.97] active:opacity-90",
  {
    variants: {
      variant: {
        default:
          "border border-primary/40 bg-primary/15 text-primary ring-1 ring-primary/25 shadow-xs hover:bg-primary/25 hover:border-primary/60 hover:ring-primary/40 dark:bg-primary/20 dark:text-foreground dark:hover:bg-primary/30",
        destructive:
          "border border-destructive/40 bg-destructive/15 text-destructive ring-1 ring-destructive/25 shadow-xs hover:bg-destructive/25 hover:border-destructive/60 hover:ring-destructive/40 dark:bg-destructive/20 dark:text-destructive-foreground dark:hover:bg-destructive/30",
        outline:
          "border border-black/[0.08] dark:border-indigo-500/30 bg-background/80 shadow-xs hover:bg-secondary hover:text-foreground hover:border-black/20 dark:hover:border-indigo-400/60 dark:hover:ring-1 dark:hover:ring-indigo-400/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/90",
        ghost: "hover:bg-secondary/80 hover:text-foreground dark:hover:bg-white/[0.08]",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0 hover:scale-100",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base font-semibold",
        icon: "h-11 w-11 rounded-xl",
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
