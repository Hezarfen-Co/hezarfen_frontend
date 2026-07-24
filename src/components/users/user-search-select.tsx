import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { getUserSearch } from "@/api/users";
import type { PersonRef, Role } from "@/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const MAX_VISIBLE_RESULTS = 8;

export function UserSearchSelect(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelectUser?: (user: PersonRef | null) => void;
  label?: string;
  excludeIds?: string[];
  placeholder?: string;
  selectPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowManualValue?: boolean;
  role?: Role;
}) {
  let inputRef: HTMLInputElement | undefined;
  const t = useT();
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal(false);
  const [selectedUser, setSelectedUser] = createSignal<PersonRef | null>(null);
  const [lastSelectedLabel, setLastSelectedLabel] = createSignal("");
  const [users, setUsers] = createSignal<PersonRef[]>([]);
  const [loading, setLoading] = createSignal(false);
  const options = createMemo(() => {
    const excluded = new Set(props.excludeIds ?? []);
    return users().filter((user) => !excluded.has(user.id)).slice(0, MAX_VISIBLE_RESULTS);
  });
  const showResults = createMemo(() => query().trim().length > 0 && options().length > 0);
  const dropdownOpen = createMemo(() => open() && showResults());
  const hintText = createMemo(() => {
    const q = query().trim();
    if (q.length === 0) return "";
    if (loading()) return t("common.loading");
    if (selectedUser() && selectedUser()!.id === props.value) return "";
    if (options().length === 0) return props.emptyMessage ?? (props.role === "teacher" ? t("form.noTeachers") : t("form.noStudents"));
    return "";
  });

  let abortController: AbortController | null = null;
  createEffect(() => {
    const q = query().trim();
    abortController?.abort();
    if (q.length === 0) {
      setUsers([]);
      return;
    }
    // Debounce keystrokes so a typed name is one request, not one per letter.
    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      abortController = controller;
      setLoading(true);
      void getUserSearch(q, controller.signal, props.role)
        .then((data) => setUsers(data.items))
        .catch(() => {
          if (!controller.signal.aborted) setUsers([]);
        })
        .finally(() => setLoading(false));
    }, 250);
    onCleanup(() => window.clearTimeout(timer));
  });

  createEffect(() => {
    const value = props.value.trim();
    if (!value) {
      if (selectedUser()) {
        setSelectedUser(null);
        props.onSelectUser?.(null);
      }
      if (query() === lastSelectedLabel()) {
        setQuery("");
        if (inputRef) inputRef.value = "";
      }
      setLastSelectedLabel("");
      return;
    }

    const selected = selectedUser();
    if (selected?.id === value) return;

    const match = options().find((user) => user.id === value);
    if (!match) return;

    setSelectedUser(match);
    const label = personLabelWithId(match);
    setLastSelectedLabel(label);
    setQuery(label);
    if (inputRef) inputRef.value = label;
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
    props.onSelectUser?.(user);
    if (inputRef) inputRef.value = label;
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
          if (el && lastSelectedLabel() && !el.value) {
            el.value = lastSelectedLabel();
          }
        }}
        id={`${props.id}-query`}
        role="combobox"
        aria-expanded={dropdownOpen()}
        aria-controls={`${props.id}-results`}
        autocomplete="off"
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
          class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden"
        >
          <ul role="listbox" class="space-y-1">
            <For each={options()}>
              {(user) => (
                <li role="option" aria-selected={props.value === user.id}>
                  <button
                    type="button"
                    class="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
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
      <Show when={hintText()}>
        <p class={query().trim().length > 0 && options().length === 0 && !loading() ? "text-xs text-destructive font-medium mt-1" : "text-xs text-muted-foreground mt-1"}>{hintText()}</p>
      </Show>
    </div>
  );
}
