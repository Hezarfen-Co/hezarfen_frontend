import { createMemo } from "solid-js";
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

export type SearchableOption = { value: string; label: string };

/**
 * Type-to-filter dropdown over a preloaded option list. Kobalte handles
 * filtering, keyboard nav, ARIA and highlight. Drop-in for a native `<Select>`
 * when the list is long enough to warrant search (> ~7 options).
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
  const selected = createMemo(() => props.options.find((o) => o.value === props.value) ?? null);
  return (
    <Combobox<SearchableOption>
      options={props.options}
      value={selected()}
      onChange={(option) => props.onChange(option?.value ?? "")}
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
      <ComboboxContent />
    </Combobox>
  );
}
