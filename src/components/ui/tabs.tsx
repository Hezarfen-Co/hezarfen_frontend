import { Tabs as TabsPrimitive } from "@kobalte/core/tabs";
import type { ComponentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive;

export function TabsList<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TabsPrimitive.List<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.List>, ["class"]);
  return (
    <TabsPrimitive.List
      class={cn(
        "sticky top-2 z-20 flex w-full max-w-full snap-x items-center gap-1 overflow-x-auto rounded-2xl border border-black/[0.06] bg-background/90 p-1 text-muted-foreground shadow-sm backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/[0.08] sm:static [&::-webkit-scrollbar]:hidden",
        local.class,
      )}
      {...rest}
    />
  );
}

export function TabsTrigger<T extends ValidComponent = "button">(
  props: ComponentProps<typeof TabsPrimitive.Trigger<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Trigger>, ["class"]);
  return (
    <TabsPrimitive.Trigger
      class={cn(
        "inline-flex h-9 min-w-24 shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm",
        local.class,
      )}
      {...rest}
    />
  );
}

export function TabsContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TabsPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Content>, ["class"]);
  return (
    <TabsPrimitive.Content
      class={cn("mt-3 hidden rounded-2xl border border-border bg-card p-4 shadow-sm outline-none data-[selected]:block focus-visible:ring-2 focus-visible:ring-ring", local.class)}
      {...rest}
    />
  );
}
