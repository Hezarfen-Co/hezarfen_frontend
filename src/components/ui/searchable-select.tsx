import { Show, createMemo, createSignal } from "solid-js";
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxHiddenSelect,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { matchesSearch } from "@/lib/search-text";
import { useT } from "@/stores/preferences-context";

export type SearchableOption = { value: string; label: string };

/**
 * Type-to-filter dropdown over a preloaded option list. Kobalte handles
 * keyboard nav, ARIA and highlight; the filter is ours so that typing
 * "9a matematik" finds "9-A · Matematik" — Kobalte's own "contains" is a raw
 * substring test and misses both the dash and the word order.
 */
export function SearchableSelect(props: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  class?: string;
}) {
  const t = useT();
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;
  const selected = createMemo(() => props.options.find((o) => o.value === props.value) ?? null);
  const filter = (option: SearchableOption, input: string) => matchesSearch(input, option.label);
  const changeOpen = (nextOpen: boolean, fromTyping = false) => {
    setOpen(nextOpen);
    if (!nextOpen || fromTyping || !inputRef) return;
    // Kobalte owns the displayed input value. An input event clears its
    // internal filter as well as the field, without changing the selection.
    inputRef.value = "";
    inputRef.dispatchEvent(new Event("input", { bubbles: true }));
  };
  // Kobalte renders nothing when its filter keeps no option, which reads as a
  // broken dropdown; this says the search came up empty instead.
  const empty = createMemo(() => {
    const input = query().trim();
    if (!input || input === selected()?.label) return false;
    return !props.options.some((option) => filter(option, input));
  });

  return (
    <Combobox<SearchableOption>
      options={props.options}
      // Open state is ours: Kobalte's click handler only ever OPENS (and only
      // when triggerMode is "focus"), so with it a field click could not close
      // the list again and a pick re-opened it on the focus-back. Owning the
      // signal makes the field a real toggle: click opens, click again closes,
      // picking an option leaves it closed. Everything else (typing, ArrowDown,
      // Escape, the chevron, click-outside) still drives this same signal.
      open={open()}
      onOpenChange={(nextOpen, triggerMode) => changeOpen(nextOpen, triggerMode === "input")}
      value={selected()}
      onChange={(option) => props.onChange(option?.value ?? "")}
      onInputChange={setQuery}
      defaultFilter={filter}
      // Without this Kobalte closes the popover when its filter keeps nothing,
      // so the "no results" line below would never get a chance to render.
      allowsEmptyCollection
      optionValue="value"
      optionLabel="label"
      optionTextValue="label"
      placeholder={props.placeholder}
      disabled={props.disabled}
      required={props.required}
      name={props.name}
      itemComponent={(itemProps) => (
        <ComboboxItem item={itemProps.item}>
          <ComboboxItemLabel>{itemProps.item.rawValue.label}</ComboboxItemLabel>
        </ComboboxItem>
      )}
    >
      <ComboboxControl class={props.class}>
        <ComboboxInput
          id={props.id}
          ref={inputRef}
          // The field is the affordance: a plain click toggles the list. The
          // chevron is a sibling button, so its own pointerdown toggle never
          // reaches this handler.
          onClick={() => changeOpen(!open())}
        />
        <ComboboxTrigger />
      </ComboboxControl>
      <ComboboxHiddenSelect />
      <ComboboxContent>
        <Show when={empty()}>
          <p class="px-2.5 py-2 text-xs text-muted-foreground">{t("common.noResults")}</p>
        </Show>
      </ComboboxContent>
    </Combobox>
  );
}
