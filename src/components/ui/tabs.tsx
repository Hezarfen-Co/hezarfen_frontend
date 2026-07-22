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
        "sticky top-2 z-20 flex w-full max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/80 bg-muted/70 p-1.5 text-muted-foreground shadow-inner backdrop-blur-xl dark:border-white/[0.1] dark:bg-muted/40 sm:static",
        local.class,
      )}
      {...rest}
    />
  );
}

export function TabsTrigger<T extends ValidComponent = "button">(
  props: ComponentProps<typeof TabsPrimitive.Trigger<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Trigger>, ["children", "class"]);
  return (
    <TabsPrimitive.Trigger
      class={cn(
        "group relative inline-flex h-10 min-w-28 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent px-4 text-sm font-semibold text-muted-foreground/75 transition-all duration-200 hover:bg-background/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-md data-[selected]:ring-1 data-[selected]:ring-border/80 dark:data-[selected]:bg-card dark:data-[selected]:ring-1 dark:data-[selected]:ring-white/[0.2] dark:data-[selected]:shadow-[0_0_16px_rgba(255,255,255,0.08)]",
        "first:tab-line-rose [&:nth-child(2)]:tab-line-blue [&:nth-child(3)]:tab-line-emerald [&:nth-child(4)]:tab-line-violet [&:nth-child(5)]:tab-line-amber [&:nth-child(6)]:tab-line-cyan",
        local.class,
      )}
      {...rest}
    >
      <span class="relative z-10 inline-flex items-center gap-2 text-muted-foreground/75 transition-colors duration-200 group-data-[selected]:text-foreground">
        {local.children}
      </span>
      <span class="tab-indicator-line absolute bottom-0.5 left-3.5 right-3.5 h-0.5 origin-center scale-x-0 rounded-full opacity-0 transition-all duration-300 ease-out group-data-[selected]:scale-x-100 group-data-[selected]:opacity-100" />
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TabsPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Content>, ["class"]);
  return (
    <TabsPrimitive.Content
      class={cn("mt-3 hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm outline-none data-[selected]:block focus-visible:ring-2 focus-visible:ring-ring dark:border-white/[0.08]", local.class)}
      {...rest}
    />
  );
}
