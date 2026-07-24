import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
import { IconCheck, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export function DropdownMenuContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.Content<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DropdownMenuPrimitive.Content>, [
    "class",
  ]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        class={cn(
          "z-50 min-w-48 overflow-hidden rounded-2xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl p-1.5 text-popover-foreground shadow-apple outline-hidden",
          "origin-(--kb-menu-content-transform-origin)",
          "animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.Item<T>> & {
    inset?: boolean;
    destructive?: boolean;
  },
) {
  const [local, rest] = splitProps(props as any, ["class", "inset", "destructive"]);
  return (
    <DropdownMenuPrimitive.Item
      class={cn(
        "relative flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-hidden transition-all duration-150",
        "focus:bg-primary/10 focus:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary active:scale-[0.98]",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        local.inset && "pl-9",
        local.destructive &&
          "text-destructive focus:bg-destructive/10 focus:text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive",
        local.class,
      )}
      {...rest}
    />
  );
}

export function DropdownMenuCheckboxItem<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem<T>>,
) {
  const [local, rest] = splitProps(props as any, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      class={cn(
        "relative flex min-h-10 cursor-pointer select-none items-center rounded-xl py-2 pl-9 pr-3 text-sm font-medium outline-hidden transition-all duration-150",
        "focus:bg-primary/10 focus:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary active:scale-[0.98]",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        local.class,
      )}
      {...rest}
    >
      <span class="absolute left-2.5 flex h-4 w-4 items-center justify-center text-primary">
        <DropdownMenuPrimitive.ItemIndicator>
          <IconCheck class="h-4 w-4 stroke-[2.5]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuLabel(props: ParentProps<{ class?: string }>) {
  return (
    <DropdownMenuPrimitive.GroupLabel
      class={cn("px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70", props.class)}
    >
      {props.children}
    </DropdownMenuPrimitive.GroupLabel>
  );
}

export function DropdownMenuSeparator(props: { class?: string }) {
  return <DropdownMenuPrimitive.Separator class={cn("-mx-1 my-1.5 h-px bg-border/60", props.class)} />;
}

export function DropdownMenuRadioItem<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.RadioItem<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DropdownMenuPrimitive.RadioItem>, [
    "class",
    "children",
  ]);
  return (
    <DropdownMenuPrimitive.RadioItem
      class={cn(
        "relative flex min-h-10 cursor-pointer select-none items-center rounded-xl py-2 pl-9 pr-3 text-sm font-medium outline-hidden transition-all duration-150",
        "focus:bg-primary/10 focus:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary active:scale-[0.98]",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        local.class,
      )}
      {...rest}
    >
      <span class="absolute left-2.5 flex h-4 w-4 items-center justify-center text-primary">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg viewBox="0 0 8 8" class="h-2.5 w-2.5 fill-current" aria-hidden>
            <circle cx="4" cy="4" r="3.5" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {local.children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSubTrigger<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger<T>> & { inset?: boolean },
) {
  const [local, rest] = splitProps(props as any, ["class", "children", "inset"]);
  return (
    <DropdownMenuPrimitive.SubTrigger
      class={cn(
        "flex min-h-10 w-full cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-hidden transition-all duration-150",
        "focus:bg-primary/10 focus:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary data-expanded:bg-primary/10 data-expanded:text-primary",
        local.inset && "pl-9",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <IconChevronRight class="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent<T extends ValidComponent = "div">(
  props: ComponentProps<typeof DropdownMenuPrimitive.SubContent<T>>,
) {
  const [local, rest] = splitProps(props as ComponentProps<typeof DropdownMenuPrimitive.SubContent>, [
    "class",
  ]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        class={cn(
          "z-50 min-w-36 overflow-hidden rounded-2xl border border-black/8 dark:border-white/12 bg-popover/95 backdrop-blur-xl p-1.5 text-popover-foreground shadow-apple outline-hidden",
          "origin-(--kb-menu-content-transform-origin)",
          "animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          local.class,
        )}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
