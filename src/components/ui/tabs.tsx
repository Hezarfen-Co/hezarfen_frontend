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
        // Segmented pill bar: a bordered "well" the active tab sits inside,
        // reading as a switch control rather than a subtle underline —
        // matches what appointments/marks/course-detail already used ad hoc.
        "inline-flex h-auto w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/80 p-1 text-muted-foreground shadow-xs sm:w-fit",
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
        "group inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,box-shadow,color] duration-200 hover:bg-muted/70 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-selected:border-border data-selected:bg-surface-base data-selected:text-foreground data-selected:shadow-xs",
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
