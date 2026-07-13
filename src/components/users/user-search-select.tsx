import { For, Show, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { getUserSearch } from "@/api/getUserSearch";
import type { PersonRef } from "@/api/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const MAX_VISIBLE_RESULTS = 8;

export function UserSearchSelect(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  excludeIds?: string[];
  placeholder?: string;
  selectPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowManualValue?: boolean;
}) {
  let inputRef: HTMLInputElement | undefined;
  const t = useT();
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  const [selectedUser, setSelectedUser] = createSignal<PersonRef | null>(null);
  const [lastSelectedLabel, setLastSelectedLabel] = createSignal("");
  const search = createMemo(() => {
    const q = query().trim();
    if (q.length === 0) return null;
    return q;
  });
  const [users] = createResource(search, async (source) => {
    if (!source) return [];
    return getUserSearch(source);
  });
  const options = createMemo(() => {
    const excluded = new Set(props.excludeIds ?? []);
    return (users() ?? []).filter((user) => !excluded.has(user.id)).slice(0, MAX_VISIBLE_RESULTS);
  });
  const showResults = createMemo(() => query().trim().length > 0 && options().length > 0);
  const dropdownOpen = createMemo(() => open() && showResults());
  const hasManualValue = createMemo(() => {
    const value = props.value.trim();
    return props.allowManualValue && value.length > 0 && !options().some((user) => user.id === value);
  });
  const hint = () => {
    if (query().trim().length === 0) return "";
    if (users.loading) return t("common.loading");
    if (hasManualValue()) return props.value;
    if (options().length === 0) return props.emptyMessage ?? t("form.noStudents");
    return "";
  };

  createEffect(() => {
    const value = props.value.trim();
    if (!value) {
      if (selectedUser()) setSelectedUser(null);
      if (query() === lastSelectedLabel()) setQuery("");
      setLastSelectedLabel("");
      return;
    }

    const selected = selectedUser();
    if (selected?.id === value) return;

    const match = options().find((user) => user.id === value);
    if (!match) return;

    setSelectedUser(match);
    setLastSelectedLabel(personLabelWithId(match));
  });

  const onInput = (value: string) => {
    setQuery(value);
    setOpen(value.trim().length > 0);

    if (props.allowManualValue) {
      if (value !== lastSelectedLabel()) props.onChange(value.trim());
      return;
    }

    if (props.value && value !== lastSelectedLabel()) {
      setSelectedUser(null);
      setLastSelectedLabel("");
      props.onChange("");
    }
  };

  const selectUser = (user: PersonRef) => {
    const label = personLabelWithId(user);
    setSelectedUser(user);
    setLastSelectedLabel(label);
    setQuery(label);
    setOpen(false);
    props.onChange(user.id);
    queueMicrotask(() => inputRef?.focus({ preventScroll: true }));
  };

  return (
    <div class="relative space-y-2">
      <Show when={props.label}>
        {(label) => <Label for={`${props.id}-query`}>{label()}</Label>}
      </Show>
      <Input
        ref={(el) => {
          inputRef = el;
        }}
        id={`${props.id}-query`}
        role="combobox"
        aria-expanded={dropdownOpen()}
        aria-controls={`${props.id}-results`}
        autocomplete="off"
        value={query()}
        disabled={props.disabled}
        placeholder={props.placeholder ?? props.selectPlaceholder ?? t("common.searchPlaceholder")}
        onFocus={() => setOpen(query().trim().length > 0)}
        onInput={(event) => onInput(event.currentTarget.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      />
      <Show when={dropdownOpen()}>
        <div
          id={`${props.id}-results`}
          class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none"
        >
          <ul role="listbox" class="space-y-1">
            <For each={options()}>
              {(user) => (
                <li role="option" aria-selected={props.value === user.id}>
                  <button
                    type="button"
                    class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectUser(user)}
                  >
                    {personLabelWithId(user)}
                  </button>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
      <Show when={hint()}>
        {(message) => <p class="text-xs text-muted-foreground">{message()}</p>}
      </Show>
    </div>
  );
}
