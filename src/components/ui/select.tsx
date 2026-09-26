import { For, Show, createEffect, createSignal, onCleanup, onMount, splitProps, type ComponentProps, type JSX } from "solid-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconCheck, IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Shared trigger look for every dropdown-style picker (Select, DropdownSelect). */
const SELECT_TRIGGER =
  "inline-flex items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-border hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-expanded:border-border data-expanded:bg-muted/60";

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
        // A prefixed picker is a filter chip, whose first option is its "all"
        // default; any other value marks it active so the toolbar can tint it.
        data-filter-active={props.labelPrefix && props.options.length > 0 && props.value !== props.options[0].value ? "" : undefined}
        class={cn(
          SELECT_TRIGGER,
          "h-8",
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
                  isSelected() && "bg-primary/10 text-primary-text font-semibold",
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
                  <IconCheck class="h-3.5 w-3.5 shrink-0 text-primary-text" />
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

type OptionSnapshot = { value: string; label: string; disabled: boolean };

/**
 * Drop-in for a native `<select>` with `<option>` children, drawn as the app's
 * own dropdown menu. The native element stays in the DOM (visually hidden) and
 * remains the source of truth: it holds `name`/`required`/labels for forms and
 * tests, and picking an item sets its value and fires a real `change` event,
 * so every existing `onChange={(e) => e.currentTarget.value}` keeps working.
 */
export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["class", "wrapperClass", "disabled"]);
  let native: HTMLSelectElement | undefined;
  const [options, setOptions] = createSignal<OptionSnapshot[]>([]);
  const [current, setCurrent] = createSignal("");

  const snapshot = () => {
    if (!native) return;
    setOptions(
      Array.from(native.options).map((option) => ({
        value: option.value,
        label: option.textContent ?? "",
        disabled: option.disabled,
      })),
    );
    setCurrent(native.value);
  };

  onMount(() => {
    snapshot();
    // <For> inside the select adds options after mount; follow them.
    const observer = new MutationObserver(snapshot);
    observer.observe(native!, { childList: true, subtree: true, characterData: true, attributes: true });
    native!.addEventListener("change", snapshot);
    onCleanup(() => {
      observer.disconnect();
      native?.removeEventListener("change", snapshot);
    });
  });
  // A controlled `value` can change without touching the option list.
  createEffect(() => {
    void props.value;
    queueMicrotask(snapshot);
  });

  const selected = () => options().find((option) => option.value === current()) ?? options()[0];

  const pick = (value: string) => {
    if (!native || native.value === value) return;
    native.value = value;
    native.dispatchEvent(new Event("input", { bubbles: true }));
    native.dispatchEvent(new Event("change", { bubbles: true }));
  };

  return (
    <div class={cn("relative w-full", local.wrapperClass)}>
      <select
        ref={native}
        tabIndex={-1}
        aria-hidden="true"
        disabled={local.disabled}
        class="sr-only"
        {...rest}
      />
      <DropdownMenu placement="bottom-start" gutter={6} sameWidth>
        <DropdownMenuTrigger
          disabled={local.disabled}
          aria-label={props["aria-label"] ?? selected()?.label}
          class={cn(SELECT_TRIGGER, "h-9 w-full", local.class)}
        >
          <span class="min-w-0 flex-1 truncate text-left">{selected()?.label ?? ""}</span>
          <IconChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent class="max-h-72 min-w-40 overflow-y-auto">
          <For each={options()}>
            {(option) => (
              <DropdownMenuItem
                disabled={option.disabled}
                class={cn(
                  "flex items-center justify-between gap-2.5 text-sm",
                  option.value === current() && "bg-primary/10 font-semibold text-primary-text",
                )}
                onSelect={() => pick(option.value)}
              >
                <span class="truncate">{option.label}</span>
                <Show when={option.value === current()}>
                  <IconCheck class="h-3.5 w-3.5 shrink-0 text-primary-text" />
                </Show>
              </DropdownMenuItem>
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
