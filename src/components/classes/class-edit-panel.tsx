import { For, Show, createEffect, createSignal } from "solid-js";
import { patchClassById } from "@/api/classes";
import { formatApiError, type AcademicYear, type ClassGroup } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useT } from "@/stores/preferences-context";

/**
 * A şube's edit form (name, grade, academic year, homeroom teacher). One
 * component for the class detail page header and the classes list's row menu,
 * so both send the same PATCH. The panel closes itself on success and hands
 * the saved row back; the caller refetches and shows its own flash.
 */
export function ClassEditPanel(props: {
  cls: ClassGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (cls: ClassGroup) => void | Promise<void>;
  years: AcademicYear[];
  maxNameLen?: number;
  maxGradeLen?: number;
}) {
  const t = useT();
  const [name, setName] = createSignal("");
  const [grade, setGrade] = createSignal("");
  const [yearId, setYearId] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // Seed the form each time it opens, from the row it opens for.
  createEffect(() => {
    const c = props.cls;
    if (!props.open || !c) return;
    setName(c.name);
    setGrade(c.grade ?? "");
    setYearId(c.year ?? "");
    setTeacherId(c.teacher?.id ?? "");
    setError("");
  });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const c = props.cls;
    if (!c || pending()) return;
    setError("");
    setPending(true);
    try {
      const saved = await patchClassById(c.id, { name: name().trim(), grade: grade().trim() || null, year: yearId() || null, teacher_id: teacherId() || null });
      props.onOpenChange(false);
      await props.onSaved(saved);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved open={props.open && !!props.cls} onOpenChange={props.onOpenChange} title={t("common.edit")} description={props.cls?.name}>
      <form class="space-y-4" onSubmit={submit}>
        <div class="space-y-3">
          <div class="space-y-1.5"><Label for="edit-class-name">{t("classGroups.className")}</Label><Input id="edit-class-name" maxlength={props.maxNameLen} value={name()} onInput={(e) => setName(e.currentTarget.value)} /></div>
          <div class="space-y-1.5"><Label for="edit-class-grade">{t("classGroups.grade")}</Label><Input id="edit-class-grade" maxlength={props.maxGradeLen} value={grade()} onInput={(e) => setGrade(e.currentTarget.value)} /></div>
          <div class="space-y-1.5"><Label for="edit-class-year">{t("academicYears.year")}</Label><Select id="edit-class-year" value={yearId()} onChange={(e) => setYearId(e.currentTarget.value)}><option value="">{t("academicYears.unassigned")}</option><For each={props.years}>{(year) => <option value={year.id}>{year.name}</option>}</For></Select></div>
          <UserSearchSelect id="edit-class-teacher" label={t("classGroups.homeroomTeacher")} value={teacherId()} initialUser={props.cls?.teacher} onChange={setTeacherId} placeholder={t("classGroups.selectTeacher")} role="teacher" />
        </div>
        <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
        <div class="flex gap-2 border-t pt-4"><Button type="submit" disabled={pending()}>{t("common.save")}</Button><Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button></div>
      </form>
    </SidePanel>
  );
}
