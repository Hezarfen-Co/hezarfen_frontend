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
        "sticky top-2 z-20 flex w-full max-w-full items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/80 bg-muted/80 p-1.5 text-muted-foreground shadow-inner backdrop-blur-xl sm:static",
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
        "group relative inline-flex h-10 min-w-28 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent px-4 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:bg-card/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-selected:border-border/80 data-selected:bg-card data-selected:text-foreground data-selected:shadow-sm",
        local.class,
      )}
      {...rest}
    >
      <span class="relative z-10 inline-flex items-center gap-2 text-muted-foreground/75 transition-colors duration-200 group-data-selected:text-foreground">
        {local.children}
      </span>
      <span class="absolute bottom-0.5 left-3.5 right-3.5 h-0.5 origin-center scale-x-0 rounded-full bg-primary opacity-0 transition-all duration-200 ease-out group-data-selected:scale-x-100 group-data-selected:opacity-100" />
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TabsPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Content>, ["class"]);
  return (
    <TabsPrimitive.Content
      class={cn("mt-3 hidden rounded-2xl border border-border/80 bg-card p-4 shadow-xs outline-hidden data-selected:block focus-visible:ring-2 focus-visible:ring-ring", local.class)}
      {...rest}
    />
  );
}
