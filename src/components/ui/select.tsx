import { For, Show, type JSX, splitProps, type ComponentProps } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCheck, IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  icon?: JSX.Element;
};

export type DropdownSelectProps<T extends string | number = string> = {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  labelPrefix?: string;
  class?: string;
  triggerClass?: string;
  disabled?: boolean;
};

export function DropdownSelect<T extends string | number = string>(props: DropdownSelectProps<T>) {
  const selectedOption = () => props.options.find((opt) => opt.value === props.value);
  const displayLabel = () => selectedOption()?.label ?? props.placeholder ?? "";

  return (
    <DropdownMenu placement="bottom-start" gutter={6}>
      <DropdownMenuTrigger
        disabled={props.disabled}
        class={cn(
          "inline-flex h-9 items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm font-medium text-foreground transition-all hover:border-border hover:bg-muted active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
          props.triggerClass,
          props.class,
        )}
      >
        <div class="flex items-center gap-1.5 min-w-0 truncate">
          <Show when={props.labelPrefix}>
            <span class="shrink-0 text-xs font-semibold text-muted-foreground">{props.labelPrefix}:</span>
          </Show>
          <Show when={selectedOption()?.icon}>
            <span class="shrink-0">{selectedOption()!.icon}</span>
          </Show>
          <span class="truncate font-medium">{displayLabel()}</span>
        </div>
        <IconChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200" />
      </DropdownMenuTrigger>
      <DropdownMenuContent class="max-h-72 min-w-48 overflow-y-auto">
        <For each={props.options}>
          {(option) => {
            const isSelected = () => option.value === props.value;
            return (
              <DropdownMenuItem
                class={cn(
                  "flex items-center justify-between gap-2.5 text-sm",
                  isSelected() && "bg-primary/10 text-primary font-semibold",
                )}
                onSelect={() => props.onChange(option.value)}
              >
                <div class="flex items-center gap-2 min-w-0 truncate">
                  <Show when={option.icon}>
                    <span class="shrink-0">{option.icon}</span>
                  </Show>
                  <span class="truncate">{option.label}</span>
                </div>
                <Show when={isSelected()}>
                  <IconCheck class="h-3.5 w-3.5 shrink-0 text-primary" />
                </Show>
              </DropdownMenuItem>
            );
          }}
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type SelectProps = ComponentProps<"select"> & {
  wrapperClass?: string;
};

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["class", "wrapperClass"]);
  return (
    <div class={cn("relative w-full", local.wrapperClass)}>
      <select
        class={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-background/90 py-2 pl-3 pr-9 text-sm text-foreground shadow-sm transition-all",
          "hover:border-ring/45 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-popover [&>option]:text-popover-foreground [&>option]:py-1.5",
          local.class,
        )}
        {...rest}
      />
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
        <IconChevronDown class="h-4 w-4" />
      </span>
    </div>
  );
}
