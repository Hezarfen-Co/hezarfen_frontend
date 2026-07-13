import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import type { ComponentProps, ParentProps, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";
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
          "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          "origin-[var(--kb-menu-content-transform-origin)]",
          "animate-in fade-in-0 zoom-in-95",
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
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.inset && "pl-8",
        local.destructive &&
          "text-destructive focus:bg-destructive/10 focus:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive",
        local.class,
      )}
      {...rest}
    />
  );
}

export function DropdownMenuLabel(props: ParentProps<{ class?: string }>) {
  return (
    <DropdownMenuPrimitive.GroupLabel
      class={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", props.class)}
    >
      {props.children}
    </DropdownMenuPrimitive.GroupLabel>
  );
}

export function DropdownMenuSeparator(props: { class?: string }) {
  return <DropdownMenuPrimitive.Separator class={cn("-mx-1 my-1 h-px bg-muted", props.class)} />;
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
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
        "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        local.class,
      )}
      {...rest}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg viewBox="0 0 8 8" class="h-2 w-2 fill-current" aria-hidden>
            <circle cx="4" cy="4" r="4" />
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
        "flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "focus:bg-accent data-[highlighted]:bg-accent data-[expanded]:bg-accent",
        local.inset && "pl-8",
        local.class,
      )}
      {...rest}
    >
      {local.children}
      <svg
        viewBox="0 0 24 24"
        class="ml-1 h-4 w-4 shrink-0 opacity-50"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
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
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          "origin-[var(--kb-menu-content-transform-origin)]",
          "animate-in fade-in-0 zoom-in-95",
          local.class,
        )}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
