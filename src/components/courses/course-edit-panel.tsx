import { For, Show, createEffect, createSignal } from "solid-js";
import { patchCourseById } from "@/api/courses";
import { formatApiError, type Course, type CourseKind } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

const COURSE_KINDS: CourseKind[] = ["course", "study", "club"];

/**
 * The catalog row's edit form (title, description, kind). One component for
 * the course detail page header and the courses list's row menu, so both
 * write the same PATCH. The panel closes itself on success and hands the
 * saved row back; the caller refetches and shows its own flash.
 */
export function CourseEditPanel(props: {
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (course: Course) => void | Promise<void>;
}) {
  const t = useT();
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [kind, setKind] = createSignal<CourseKind>("course");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // Seed the form each time it opens, from the row it opens for.
  createEffect(() => {
    const c = props.course;
    if (!props.open || !c) return;
    setTitle(c.title);
    setDescription(c.description);
    setKind(c.kind ?? "course");
    setError("");
  });

  const kindLabel = (value: CourseKind) =>
    value === "study" ? t("courses.kind.study") : value === "club" ? t("courses.kind.club") : t("courses.kind.course");

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const c = props.course;
    if (!c || pending()) return;
    setError("");
    setPending(true);
    try {
      const saved = await patchCourseById(c.id, { title: title().trim(), description: description(), kind: kind() });
      props.onOpenChange(false);
      await props.onSaved(saved);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved open={props.open && !!props.course} onOpenChange={props.onOpenChange} title={t("common.edit")} description={props.course?.title}>
      <form class="space-y-4" onSubmit={submit}>
        <div class="space-y-3 rounded-xl border border-border-line bg-surface-tint p-4">
          <div class="space-y-1.5">
            <Label for="edit-course-title">{t("form.title")}</Label>
            <Input id="edit-course-title" value={title()} required maxlength={200} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="edit-course-desc">{t("form.description")}</Label>
            <Textarea id="edit-course-desc" value={description()} rows={3} maxlength={2000} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="edit-course-kind">{t("courses.kind")}</Label>
            <Select id="edit-course-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as CourseKind)}>
              <For each={COURSE_KINDS}>{(item) => <option value={item}>{kindLabel(item)}</option>}</For>
            </Select>
          </div>
        </div>
        <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
        <div class="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-border-line bg-surface-base px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
          <Button type="submit" class="flex-1 rounded-xl sm:flex-none" disabled={pending()}>
            {t("common.update")}
          </Button>
          <Button type="button" variant="outline" class="flex-1 rounded-xl sm:flex-none" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
