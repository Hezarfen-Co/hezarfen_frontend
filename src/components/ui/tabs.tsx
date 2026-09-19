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
        "inline-flex h-auto w-full max-w-full items-stretch justify-start gap-0 overflow-x-auto rounded-lg border border-border-line bg-surface-base p-0 text-muted-foreground shadow-none sm:w-fit",
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
      type="button"
      class={cn(
        "group inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-r border-transparent border-r-border-line px-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,box-shadow,color] duration-200 last:border-r-0 hover:bg-muted/50 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:border-b-primary data-selected:bg-surface-base data-selected:text-foreground data-selected:shadow-none",
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
