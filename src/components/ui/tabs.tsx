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
        // Underline tab bar: flat, bottom-ruled, no pill container.
        "flex h-auto w-full max-w-full items-center gap-6 overflow-x-auto border-b border-border/70 text-muted-foreground",
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
        "group -mb-px inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 pb-2.5 pt-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:border-foreground data-selected:text-foreground",
        local.class,
      )}
      {...rest}
    >
      <span class="inline-flex items-center gap-2">
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
