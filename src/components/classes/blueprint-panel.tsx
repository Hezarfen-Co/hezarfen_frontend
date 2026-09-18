import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  getClassBlueprintByGrade,
  patchClassBlueprintByGrade,
  postClassBlueprint,
} from "@/api/classes";
import { ApiError, formatApiError, type BlueprintResult, type ClassBlueprint, type Course } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { courseKindLabel } from "@/lib/course-kind";
import { matchesSearch } from "@/lib/search-text";
import { useT } from "@/stores/preferences-context";

export function BlueprintPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new blueprint; set edits that grade's course set. */
  blueprint: ClassBlueprint | null;
  courses: Course[];
  maxCourses: number;
  maxGradeLen: number;
  onSaved: (result: BlueprintResult) => void;
}) {
  const t = useT();
  const [grade, setGrade] = createSignal("");
  const [selected, setSelected] = createSignal<string[]>([]);
  const [filter, setFilter] = createSignal("");
  const [error, setError] = createSignal("");
  const [warning, setWarning] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const editing = () => props.blueprint !== null;

  // The panel instance is reused between "edit grade 9" and "edit grade 10",
  // and props are not read at construction time in Solid — seeding these at
  // the top of the component would freeze the first blueprint's course set.
  createEffect(() => {
    if (!props.open) return;
    const bp = props.blueprint;
    setGrade(bp?.grade ?? "");
    setSelected(bp?.courses ? [...bp.courses] : []);
    setFilter("");
    setError("");
    setWarning("");
  });

  const visibleCourses = createMemo(() => {
    const q = filter().trim();
    if (!q) return props.courses;
    return props.courses.filter((c) => matchesSearch(q, c.title));
  });

  const isSelected = (id: string) => selected().includes(id);
  const atCeiling = () => selected().length >= props.maxCourses;

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  // A losing race has no version token to retry with, so re-read the blueprint,
  // reseed the checkboxes from the server's list, and let the user resubmit.
  const reseedFromServer = async (g: string) => {
    try {
      const fresh = await getClassBlueprintByGrade(g);
      setSelected([...fresh.courses]);
      setWarning(t("classBlueprints.staleReload"));
      setError("");
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    const g = grade().trim();
    if (!g) return;
    setError("");
    setWarning("");
    setPending(true);
    try {
      const result = editing()
        ? await patchClassBlueprintByGrade(g, { course_ids: selected() })
        : await postClassBlueprint({ grade: g, course_ids: selected() });
      props.onSaved(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (editing()) {
          await reseedFromServer(g);
        } else {
          setError(t("classBlueprints.conflictExists"));
        }
      } else {
        setError(formatApiError(err));
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={editing() ? t("classBlueprints.edit") : t("classBlueprints.new")}
      description={t("classBlueprints.selectCourses")}
      size="wide"
    >
      <form onSubmit={submit} class="space-y-4">
        <Show when={warning()}>
          <Alert class="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">{warning()}</Alert>
        </Show>

        <div class="space-y-1.5">
          <Label for="bp-grade">{t("classBlueprints.grade")}</Label>
          <Input
            id="bp-grade"
            class="h-10"
            maxlength={props.maxGradeLen}
            value={grade()}
            disabled={editing()}
            onInput={(e) => setGrade(e.currentTarget.value)}
          />
          <p class="text-xs text-muted-foreground">{t("classBlueprints.gradeHint")}</p>
        </div>

        <div class="space-y-2">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <Label for="bp-filter">{t("classBlueprints.courses")}</Label>
            <span class="text-xs tabular-nums text-muted-foreground">
              {t("classBlueprints.selected", { count: selected().length, max: props.maxCourses })}
            </span>
          </div>
          <p class="text-xs text-muted-foreground">{t("classBlueprints.wholeSetHint")}</p>
          <Input
            id="bp-filter"
            class="h-8 rounded-lg text-[13px]"
            placeholder={t("classBlueprints.filterCourses")}
            value={filter()}
            onInput={(e) => setFilter(e.currentTarget.value)}
          />
          <div class="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
            <Show
              when={visibleCourses().length > 0}
              fallback={<p class="p-2 text-sm text-muted-foreground">{t("classBlueprints.noCourseMatch")}</p>}
            >
              <For each={visibleCourses()}>
                {(course) => (
                  <label class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                    <input
                      type="checkbox"
                      class="h-4 w-4 shrink-0 accent-primary"
                      checked={isSelected(course.id)}
                      disabled={!isSelected(course.id) && atCeiling()}
                      onChange={() => toggle(course.id)}
                    />
                    <span class="min-w-0 flex-1 truncate">{course.title}</span>
                    <span class="shrink-0 text-xs text-muted-foreground">{courseKindLabel(course.kind, t)}</span>
                  </label>
                )}
              </For>
            </Show>
          </div>
        </div>

        <Show when={error()}>
          <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
        </Show>

        <div class="flex justify-end">
          <Button type="submit" class="w-full sm:w-auto" disabled={pending() || !grade().trim()}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
