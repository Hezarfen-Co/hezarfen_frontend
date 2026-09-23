import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { getUserById, getUserSearch } from "@/api/users";
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
  /**
   * The person behind a preset `value` (e.g. the class's current teacher), so
   * the field names them instead of showing the placeholder. Without it a
   * preset id is resolved with one `/users/{id}` read.
   */
  initialUser?: PersonRef | null;
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

  // A value set by the parent (an edit form opening on a saved record) has no
  // picked option behind it, so the input would read as empty. Show the
  // person it points at: from `initialUser` when given, else one lookup.
  let resolving: string | null = null;
  createEffect(() => {
    const id = props.value;
    if (!id || selected()?.id === id) return;
    const preset = props.initialUser;
    if (preset && preset.id === id) {
      setSelected(preset);
      return;
    }
    if (!canSearch() || resolving === id) return;
    resolving = id;
    void getUserById(id)
      .then((user) => {
        if (props.value !== id) return;
        setSelected({
          id: user.id,
          username: user.username,
          display_name: user.display_name || [user.name, user.surname].filter(Boolean).join(" ") || null,
        });
      })
      .catch(() => {
        // Unreadable account: leave the field empty rather than show the uuid.
      })
      .finally(() => {
        if (resolving === id) resolving = null;
      });
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
    // An empty query is a request for suggestions: `/users/search?q=` lists
    // the role's people, so the field works as a dropdown before any typing.
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
    }, q.length === 0 ? 0 : 300);
  };
  // Opening the list (focus, the chevron) with nothing typed yet loads the
  // suggestions once; typing narrows them through the search.
  const openSuggestions = () => {
    if (!canSearch() || props.disabled) return;
    setOpen(true);
    if (query().trim() === "" && users().length === 0 && !loading()) runSearch("");
  };
  onCleanup(() => {
    controller?.abort();
    clearTimeout(timer);
  });

  const emptyText = createMemo(() => {
    if (loading() || options().length > 0 || (query().trim() === "" && selected())) return "";
    return props.emptyMessage ?? (props.role === "teacher" ? t("form.noTeachers") : t("form.noStudents"));
  });

  return (
    <div class="space-y-2">
      <Show when={props.label}>{(label) => <Label for={props.id}>{label()}</Label>}</Show>
      <Combobox<PersonRef>
        // Kobalte writes the picked person's name into the input only when
        // that person is among the options, so a preset one rides along
        // while nothing is being searched.
        options={
          query().trim() === "" && selected() && !options().some((user) => user.id === selected()!.id)
            ? [selected()!, ...options()]
            : options()
        }
        // Results arrive async, so options is empty at input time. Kobalte
        // refuses to open an empty collection by default (and would close on
        // input) — allow it, and control open so the panel stays up while
        // loading, then results pop in.
        allowsEmptyCollection
        open={open()}
        onOpenChange={(nextOpen) => (nextOpen ? openSuggestions() : setOpen(false))}
        value={selected()}
        onChange={(user) => {
          setSelected(user);
          props.onChange(user?.id ?? "");
          props.onSelect?.(user ?? null);
        }}
        onInputChange={(value) => {
          // Kobalte echoes the picked person's label into the input; that is
          // not a search, and treating it as one drops the preset person from
          // the options, which makes Kobalte clear the field again.
          const current = selected();
          if (current && value === pickedLabel(current)) {
            setQuery("");
            setOpen(false);
            return;
          }
          setQuery(value);
          // Erasing the field clears the pick — the only way to leave an
          // optional person (a class's homeroom teacher) unassigned again.
          if (value.trim() === "" && current) {
            setSelected(null);
            props.onChange("");
            props.onSelect?.(null);
          }
          runSearch(value);
          setOpen(true);
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
          <ComboboxInput
            id={props.id}
            autocomplete="off"
            // Typing into a field that already names someone used to append
            // to the name ("Ayşe Yılmaz (ayse.yilmaz)Mehmet") and find no one,
            // so a class's teacher could not be changed. Select it instead.
            onFocus={(event: FocusEvent) => {
              (event.currentTarget as HTMLInputElement).select();
              openSuggestions();
            }}
          />
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
