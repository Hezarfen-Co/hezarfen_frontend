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
        "sticky top-2 z-20 inline-flex h-9 w-full max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/70 p-1 text-muted-foreground sm:static",
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
        "group inline-flex h-7 min-w-24 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1 text-sm font-semibold text-muted-foreground transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm",
        local.class,
      )}
      {...rest}
    >
      <span class="inline-flex items-center gap-2 text-muted-foreground/75 group-data-selected:text-foreground">
        {local.children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof TabsPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof TabsPrimitive.Content>, ["class"]);
  return (
    <TabsPrimitive.Content
      class={cn("mt-2 hidden outline-hidden data-selected:block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", local.class)}
      {...rest}
    />
  );
}
