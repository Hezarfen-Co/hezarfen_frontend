import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { getUserSearch } from "@/api/users";
import type { PersonRef, Role } from "@/api/client";
import {
  Combobox,
  ComboboxContent,
  ComboboxControl,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemLabel,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const MAX_VISIBLE_RESULTS = 8;

/**
 * Server-backed user autocomplete on the Kobalte Combobox primitive. Typing
 * fires a debounced `/users/search` query (previous request aborted); the user
 * picks a result and `onChange` receives the id.
 */
export function UserSearchSelect(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  excludeIds?: string[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  role?: Role;
}) {
  const t = useT();
  const [query, setQuery] = createSignal("");
  const [users, setUsers] = createSignal<PersonRef[]>([]);
  const [selected, setSelected] = createSignal<PersonRef | null>(null);
  const [loading, setLoading] = createSignal(false);

  const options = createMemo(() => {
    const excluded = new Set(props.excludeIds ?? []);
    return users().filter((user) => !excluded.has(user.id)).slice(0, MAX_VISIBLE_RESULTS);
  });

  // Drop our local selection when the parent clears the bound value.
  createEffect(() => {
    if (!props.value && selected()) setSelected(null);
  });

  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Debounce keystrokes so a typed name is one request, not one per letter.
  const runSearch = (raw: string) => {
    const q = raw.trim();
    controller?.abort();
    clearTimeout(timer);
    if (q.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    timer = setTimeout(() => {
      const ctrl = new AbortController();
      controller = ctrl;
      setLoading(true);
      void getUserSearch(q, ctrl.signal, props.role)
        .then((data) => setUsers(data.items))
        .catch(() => {
          if (!ctrl.signal.aborted) setUsers([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 250);
  };
  onCleanup(() => {
    controller?.abort();
    clearTimeout(timer);
  });

  const emptyText = createMemo(() => {
    if (query().trim().length === 0 || loading() || options().length > 0) return "";
    return props.emptyMessage ?? (props.role === "teacher" ? t("form.noTeachers") : t("form.noStudents"));
  });

  return (
    <div class="space-y-2">
      <Show when={props.label}>{(label) => <Label for={props.id}>{label()}</Label>}</Show>
      <Combobox<PersonRef>
        options={options()}
        value={selected()}
        onChange={(user) => {
          setSelected(user);
          props.onChange(user?.id ?? "");
        }}
        onInputChange={(value) => {
          setQuery(value);
          runSearch(value);
        }}
        optionValue="id"
        optionLabel={(user) => personLabelWithId(user)}
        optionTextValue={(user) => personLabelWithId(user)}
        defaultFilter={() => true}
        placeholder={props.placeholder ?? t("common.searchPlaceholder")}
        disabled={props.disabled}
        itemComponent={(itemProps) => (
          <ComboboxItem item={itemProps.item}>
            <ComboboxItemLabel>{personLabelWithId(itemProps.item.rawValue)}</ComboboxItemLabel>
          </ComboboxItem>
        )}
      >
        <ComboboxControl>
          <ComboboxInput id={props.id} autocomplete="off" />
          <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent />
      </Combobox>
      <Show when={emptyText()}>
        <p class="mt-1 text-xs font-medium text-destructive">{emptyText()}</p>
      </Show>
    </div>
  );
}
