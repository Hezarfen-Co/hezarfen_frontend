// Search-as-you-type person picker: replaces every "paste a user id" input.
// The picked user's id travels in a hidden input, so forms keep reading
// FormData exactly as before. Native validation blocks submitting free text
// that was never picked from the list.

import { For, Show, createSignal, onCleanup } from "solid-js";
import { users } from "../lib/api";
import { personLabel } from "../lib/format";
import { t } from "../lib/i18n";
import type { PersonRef } from "../lib/types";

export function UserPicker(props: {
  /** Hidden field name the form reads, e.g. "user_id". */
  name: string;
  label: string;
  onPick?: (person: PersonRef | null) => void;
}) {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<PersonRef[]>([]);
  const [picked, setPicked] = createSignal<PersonRef | null>(null);
  const [open, setOpen] = createSignal(false);
  let input!: HTMLInputElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0; // an older search must never overwrite a newer one
  onCleanup(() => clearTimeout(timer));

  const validity = () =>
    input.setCustomValidity(picked() ? "" : t("pickFromList"));

  const choose = (person: PersonRef | null) => {
    setPicked(person);
    props.onPick?.(person);
    validity();
  };

  const onInput = (value: string) => {
    setQuery(value);
    choose(null);
    clearTimeout(timer);
    const needle = value.trim();
    if (!needle) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer = setTimeout(async () => {
      const current = ++generation;
      try {
        const found = await users.search(needle);
        if (current !== generation) return;
        setResults(found);
        setOpen(true);
      } catch {
        // A failed lookup just leaves the menu empty; submitting still
        // requires a pick, so nothing wrong can go through.
        if (current === generation) setResults([]);
      }
    }, 250);
  };

  const pick = (person: PersonRef) => {
    choose(person);
    setQuery(personLabel(person));
    setOpen(false);
  };

  return (
    <label class="picker">
      {props.label}
      <span class="picker-box">
        <input
          ref={input}
          value={query()}
          placeholder={t("typeAName")}
          autocomplete="off"
          required
          onInput={(e) => onInput(e.currentTarget.value)}
          onFocus={() => results().length && setOpen(true)}
          onBlur={() => setOpen(false)}
          onInvalid={validity}
        />
        <input type="hidden" name={props.name} value={picked()?.id ?? ""} />
        <Show when={open()}>
          <div class="picker-menu">
            <Show when={results().length} fallback={<p class="muted">{t("nobodyFound")}</p>}>
              <For each={results()}>
                {(person) => (
                  // mousedown, not click: it must win against the input's blur.
                  <button type="button" onMouseDown={() => pick(person)}>
                    <strong>{personLabel(person)}</strong>
                    <span>{person.username}</span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </Show>
      </span>
    </label>
  );
}
