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
  const selected = createMemo(() => props.options.find((o) => o.value === props.value) ?? null);
  const filter = (option: SearchableOption, input: string) => matchesSearch(input, option.label);
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
        <ComboboxInput id={props.id} />
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
