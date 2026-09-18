import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { getUserSearch } from "@/api/users";
import type { PersonRef, Role } from "@/api/client";
import type { PersonLike } from "@/lib/person";
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
import { personLabel } from "@/lib/person";
import { createStudentClassLabels } from "@/lib/student-classes";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
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
  onSelect?: (user: PersonRef | null) => void;
  label?: string;
  excludeIds?: string[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Overrides the default "what can I type here" line under the field. */
  hint?: string;
  role?: Role;
}) {
  const t = useT();
  const auth = useAuth();
  // `/users/search` is teacher+ on the backend, so this component must never
  // fire it for a student or parent — they would only ever 403. Below teacher
  // the input is disabled and the request is never sent; this is the single
  // role gate for every UserSearchSelect in the app (messages compose, meal
  // service, course/class management, …).
  const canSearch = () => hasMinRole(auth.user()?.role, "teacher");
  const [query, setQuery] = createSignal("");
  const [users, setUsers] = createSignal<PersonRef[]>([]);
  const [selected, setSelected] = createSignal<PersonRef | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [open, setOpen] = createSignal(false);

  const options = createMemo(() => {
    const excluded = new Set(props.excludeIds ?? []);
    return users().filter((user) => !excluded.has(user.id)).slice(0, MAX_VISIBLE_RESULTS);
  });

  // A student picker shows the class next to the name: two students can share
  // a name, and the account id the row used to carry is a uuid nobody reads.
  // Only students get the extra lookup — see `student-classes`.
  const classLabels = createStudentClassLabels(() =>
    props.role === "student" ? options().map((user) => user.id) : [],
  );
  const secondaryLine = (user: PersonRef) => {
    const cls = classLabels()[user.id];
    return cls ? `${cls} · ${user.username}` : user.username;
  };
  // What the input reads after a pick — the name alone is ambiguous, the
  // username is the thing that is unique and short.
  const pickedLabel = (user: PersonLike) => {
    if (!user || typeof user === "string") return personLabel(user);
    const name = personLabel(user);
    return name === user.username ? name : `${name} (${user.username})`;
  };

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
    if (!canSearch()) {
      // A sub-teacher role reached a picker (e.g. message compose): never call
      // the teacher+ search endpoint.
      setUsers([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    if (q.length === 0) {
      setUsers([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    // Mark pending now, not after the debounce fires — otherwise the empty
    // "no students" message flashes during the wait before the request starts.
    setLoading(true);
    timer = setTimeout(() => {
      const ctrl = new AbortController();
      controller = ctrl;
      void getUserSearch(q, ctrl.signal, props.role)
        .then((data) => setUsers(data.items))
        .catch(() => {
          if (!ctrl.signal.aborted) setUsers([]);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 300);
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
        // Results arrive async, so options is empty at input time. Kobalte
        // refuses to open an empty collection by default (and would close on
        // input) — allow it, and control open so the panel stays up while
        // loading, then results pop in.
        allowsEmptyCollection
        open={open() && query().trim().length > 0}
        onOpenChange={(nextOpen) => setOpen(nextOpen && query().trim().length > 0)}
        value={selected()}
        onChange={(user) => {
          setSelected(user);
          props.onChange(user?.id ?? "");
          props.onSelect?.(user ?? null);
        }}
        onInputChange={(value) => {
          setQuery(value);
          runSearch(value);
          if (value.trim().length > 0) setOpen(true);
        }}
        optionValue="id"
        optionLabel={(user) => pickedLabel(user)}
        optionTextValue={(user) => pickedLabel(user)}
        defaultFilter={() => true}
        placeholder={props.placeholder ?? t("common.searchPlaceholder")}
        disabled={props.disabled || !canSearch()}
        itemComponent={(itemProps) => (
          <ComboboxItem item={itemProps.item}>
            <ComboboxItemLabel class="flex min-w-0 flex-col gap-0.5">
              <span class="truncate font-medium">{personLabel(itemProps.item.rawValue)}</span>
              <span class="truncate text-xs text-muted-foreground">{secondaryLine(itemProps.item.rawValue)}</span>
            </ComboboxItemLabel>
          </ComboboxItem>
        )}
      >
        <ComboboxControl>
          <ComboboxInput id={props.id} autocomplete="off" />
          <ComboboxTrigger />
        </ComboboxControl>
        <ComboboxContent>
          {/* The debounce plus the request leave the panel blank for a moment,
              which reads as "nothing matches" before the search even ran. */}
          <Show when={loading() && options().length === 0}>
            <p class="px-2 py-2 text-xs text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={emptyText()}>
            <p class="px-2 py-2 text-xs font-medium text-destructive-text">{emptyText()}</p>
          </Show>
        </ComboboxContent>
      </Combobox>
      <Show when={canSearch()} fallback={<p class="text-xs text-muted-foreground">{t("form.searchNoPermission")}</p>}>
        {/* An empty combobox looks like a dropdown that failed to load, so it
            says outright that it is a type-to-search field and what it matches. */}
        <p class="text-xs text-muted-foreground">
          {props.hint ?? (props.role === "student" ? t("search.hint.studentPicker") : props.role === "teacher" ? t("search.hint.teacherPicker") : t("search.hint.personPicker"))}
        </p>
      </Show>
    </div>
  );
}
