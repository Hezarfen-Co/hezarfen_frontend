import { For, Show, createMemo, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Subject } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconPlus, IconX } from "@/components/ui/icons";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useT } from "@/stores/preferences-context";

/**
 * A selected-topic set (a grade template's, or a section's own) drawn as
 * chips; editors add from the catalog course's subjects and remove chips.
 */
export function SubjectSetEditor(props: {
  selected: Subject[];
  /** The catalog course's subjects — the only ones a set may hold. */
  available: Subject[];
  canEdit: boolean;
  onAdd: (subjectId: string) => Promise<void>;
  onRemove: (subject: Subject) => Promise<void>;
}) {
  const t = useT();
  const [pick, setPick] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const addable = createMemo(() => {
    const taken = new Set(props.selected.map((subject) => subject.id));
    return props.available.filter((subject) => !taken.has(subject.id));
  });

  const run = async (action: () => Promise<void>) => {
    if (pending()) return;
    setError("");
    setPending(true);
    try {
      await action();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-3">
      <Show when={props.selected.length > 0} fallback={<p class="text-sm text-muted-foreground">{t("instances.noSubjects")}</p>}>
        <ul class="flex flex-wrap gap-1.5">
          <For each={props.selected}>
            {(subject) => (
              <li class="inline-flex items-center gap-1 rounded-md border border-border-line bg-surface-tint py-1 pl-2.5 pr-1 text-sm">
                <span class="max-w-[16rem] truncate" title={subject.description || subject.name}>{subject.name}</span>
                <Show when={props.canEdit}>
                  <button
                    type="button"
                    class="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive-text disabled:opacity-50"
                    aria-label={`${t("instances.removeSubject")}: ${subject.name}`}
                    disabled={pending()}
                    onClick={() => void run(() => props.onRemove(subject))}
                  >
                    <IconX class="h-3.5 w-3.5" />
                  </button>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.canEdit}>
        <Show when={addable().length > 0} fallback={<p class="text-xs text-muted-foreground">{t("instances.allSubjectsSelected")}</p>}>
          <div class="flex flex-wrap items-center gap-2">
            <SearchableSelect
              class="min-w-56 flex-1 sm:max-w-sm"
              value={pick()}
              onChange={setPick}
              placeholder={t("instances.addSubject")}
              options={addable().map((subject) => ({ value: subject.id, label: subject.name }))}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="rounded-lg"
              disabled={!pick() || pending()}
              onClick={() => void run(async () => { await props.onAdd(pick()); setPick(""); })}
            >
              <IconPlus class="h-4 w-4" />
              {t("instances.addSubject")}
            </Button>
          </div>
        </Show>
      </Show>
      <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
    </div>
  );
}
