import { Show, createSignal, createUniqueId } from "solid-js";
import { IconSearch, IconX } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

export type DataTableSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * What this particular box actually matches on, in the user's words. Shown
   * under the field while it has focus — a placeholder alone never says
   * whether a name, a code or a description is the thing to type. Keep it
   * honest: it must list what the filter really reads, nothing more.
   */
  hint?: string;
  /** Optional styling for the focused hint, e.g. a wider panel search hint. */
  hintClass?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
  class?: string;
};

/** Rounded search field: leading icon, conditional clear (X) button, Escape to
 *  empty it, and an optional on-focus hint naming the fields it searches. */
export function DataTableSearch(props: DataTableSearchProps) {
  const t = useT();
  const [focused, setFocused] = createSignal(false);
  const hintId = createUniqueId();
  return (
    <div
      class={cn("relative w-full sm:max-w-xs", props.class)}
      onFocusIn={() => setFocused(true)}
      onFocusOut={() => setFocused(false)}
    >
      <IconSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={props.value}
        onInput={(event) => props.onChange(event.currentTarget.value)}
        // Escape empties the box instead of only blurring it: a filter the
        // keyboard cannot undo leaves the list silently narrowed.
        onKeyDown={(event: KeyboardEvent) => {
          props.onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key !== "Escape" || !props.value) return;
          event.preventDefault();
          event.stopPropagation();
          props.onChange("");
        }}
        placeholder={props.placeholder ?? t("common.search")}
        aria-describedby={props.hint ? hintId : undefined}
        // Phones get a touch-sized box at 16px: below that iOS Safari zooms
        // the page into a focused field. Compact from `sm` up.
        class={cn("h-10 rounded-lg bg-muted/40 text-base sm:h-8 sm:text-[13px] md:text-[13px]", props.value ? "pl-9 pr-8" : "pl-9")}
      />
      <Show when={props.value}>
        <button
          type="button"
          aria-label={t("common.clearSearch")}
          onClick={() => props.onChange("")}
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconX class="h-4 w-4" />
        </button>
      </Show>
      {/* Floated rather than inline: a static line would push every toolbar
          that carries a search box taller, on every page. */}
      <Show when={props.hint && focused()}>
        <p
          id={hintId}
          class={cn("absolute left-0 top-full z-30 mt-1 w-full min-w-max max-w-[22rem] rounded-lg border border-border/80 bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground shadow-md", props.hintClass)}
        >
          {props.hint}
        </p>
      </Show>
    </div>
  );
}
