import { Show, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import {
  deleteOfferingExamWeightByKind,
  deleteOfferingSubjectById,
  deleteOfferingWeeklySlotById,
  getOfferingExamWeights,
  getOfferingSubjects,
  getOfferingWeeklyPlan,
  patchOfferingById,
  patchOfferingExamWeight,
  postOffering,
  postOfferingSubject,
  postOfferingWeeklySlot,
  type UpdateOfferingBody,
} from "@/api/offerings";
import { formatApiError, type ExamWeightEntry, type Limits, type Offering, type Subject, type WeeklySlot } from "@/api/client";
import { GradeLevelSelect } from "@/components/classes/grade-level-select";
import { ExamWeightsEditor } from "@/components/instances/exam-weights-editor";
import { SubjectSetEditor } from "@/components/instances/subject-set-editor";
import { WeeklyPlanTable } from "@/components/instances/weekly-plan-table";
import { WeeklySlotForm } from "@/components/instances/weekly-slot-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { gradeLevelLabel } from "@/lib/grade-level";
import { useT } from "@/stores/preferences-context";

const SECTION = "space-y-3 border-t border-border-hairline pt-4";
const SECTION_HEAD = "flex flex-wrap items-start justify-between gap-2";

/**
 * One grade template of a catalog course: `offering` null creates it (grade
 * plus defaults), set edits its defaults and its topic set, template week and
 * exam weights. Blank fields inherit — sent as null, never as "".
 */
export function OfferingPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  offering: Offering | null;
  canEdit: boolean;
  courseSubjects: Subject[];
  examKinds: string[];
  limits?: Limits;
  onSaved: (offering: Offering) => void | Promise<void>;
}) {
  const t = useT();
  const [gradeLevel, setGradeLevel] = createSignal<number | null>(null);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [hours, setHours] = createSignal("");
  const [karne, setKarne] = createSignal<"" | "yes" | "no">("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [addingSlot, setAddingSlot] = createSignal(false);
  const [weightEditing, setWeightEditing] = createSignal<ExamWeightEntry | "new" | null>(null);
  const [sectionError, setSectionError] = createSignal("");

  const editingId = () => (props.open && props.offering ? props.offering.id : null);
  const [subjects, { refetch: refetchSubjects }] = createResource(editingId, (id) => getOfferingSubjects(id));
  const [slots, { refetch: refetchSlots }] = createResource(editingId, (id) => getOfferingWeeklyPlan(id));
  const [weights, { refetch: refetchWeights }] = createResource(editingId, async (id) => (await getOfferingExamWeights(id)).weights);

  createEffect(() => {
    if (!props.open) return;
    const o = props.offering;
    setGradeLevel(o ? o.grade_level : null);
    setTitle(o?.title ?? "");
    setDescription(o?.description ?? "");
    setHours(o?.default_ders_saati != null ? String(o.default_ders_saati) : "");
    setKarne(o?.default_counts_toward_karne == null ? "" : o.default_counts_toward_karne ? "yes" : "no");
    setError("");
    setSectionError("");
  });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const level = gradeLevel();
    if (level === null) {
      setError(t("form.fieldRequired"));
      return;
    }
    const hoursText = hours().trim();
    const hoursValue = hoursText === "" ? null : Number(hoursText);
    const minHours = props.limits?.course.min_ders_saati ?? 1;
    const maxHours = props.limits?.course.max_ders_saati ?? 40;
    if (hoursValue !== null && (!Number.isInteger(hoursValue) || hoursValue < minHours || hoursValue > maxHours)) {
      setError(t("instances.dersSaatiInvalid"));
      return;
    }
    const fields: UpdateOfferingBody = {
      title: title().trim() || null,
      description: description().trim() || null,
      default_ders_saati: hoursValue,
      default_counts_toward_karne: karne() === "" ? null : karne() === "yes",
    };
    setError("");
    setPending(true);
    try {
      const saved = props.offering
        ? await patchOfferingById(props.offering.id, fields)
        : await postOffering({ course: props.courseId, grade_level: level, ...fields });
      await props.onSaved(saved);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const guard = async (action: () => Promise<unknown>) => {
    setSectionError("");
    try {
      await action();
    } catch (err) {
      setSectionError(formatApiError(err));
    }
  };

  return (
    <SidePanel
      guardUnsaved
      size="wide"
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.offering ? `${props.courseTitle} · ${gradeLevelLabel(props.offering.grade_level, t)}` : t("offerings.new")}
      description={t("offerings.help")}
    >
      <div class="space-y-4">
        <form class="space-y-3" noValidate onSubmit={submit}>
          <div class="space-y-1.5">
            <Label for="offering-grade">{t("classGroups.grade")}</Label>
            <GradeLevelSelect
              id="offering-grade"
              value={gradeLevel()}
              min={props.limits?.course.min_grade_level}
              max={props.limits?.course.max_grade_level}
              disabled={!!props.offering || !props.canEdit}
              onChange={setGradeLevel}
            />
          </div>
          <div class="space-y-1.5">
            <Label for="offering-title">{t("form.title")}</Label>
            <Input id="offering-title" maxlength={props.limits?.course.max_title_len} disabled={!props.canEdit} placeholder={t("offerings.titlePlaceholder", { title: props.courseTitle })} value={title()} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="offering-description">{t("form.description")}</Label>
            <Textarea id="offering-description" rows={3} maxlength={props.limits?.course.max_description_len} disabled={!props.canEdit} placeholder={t("offerings.descriptionPlaceholder")} value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label for="offering-hours">{t("offerings.defaultDersSaati")}</Label>
              <Input id="offering-hours" type="number" inputMode="numeric" min={props.limits?.course.min_ders_saati} max={props.limits?.course.max_ders_saati} disabled={!props.canEdit} placeholder="1" value={hours()} onInput={(e) => setHours(e.currentTarget.value)} />
              <p class="text-xs text-muted-foreground">{t("offerings.defaultDersSaatiHint")}</p>
            </div>
            <div class="space-y-1.5">
              <Label for="offering-karne">{t("offerings.defaultKarne")}</Label>
              <Select id="offering-karne" value={karne()} disabled={!props.canEdit} onChange={(e) => setKarne(e.currentTarget.value as "" | "yes" | "no")}>
                <option value="">{t("offerings.inheritDefault")}</option>
                <option value="yes">{t("common.yes")}</option>
                <option value="no">{t("common.no")}</option>
              </Select>
            </div>
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <Show when={props.canEdit}>
            <div class="flex gap-2">
              <Button type="submit" disabled={pending()}>{props.offering ? t("common.save") : t("common.create")}</Button>
              <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
            </div>
          </Show>
        </form>

        <Show when={props.offering}>
          {(offering) => (
            <>
              <Show when={sectionError()}><Alert variant="destructive">{sectionError()}</Alert></Show>

              <section class={SECTION}>
                <div>
                  <h3 class="text-sm font-semibold">{t("instances.subjectsTitle")}</h3>
                  <p class="text-xs text-muted-foreground">{t("offerings.subjectsHelp")}</p>
                </div>
                <SubjectSetEditor
                  selected={subjects.latest ?? []}
                  available={props.courseSubjects}
                  canEdit={props.canEdit}
                  onAdd={async (subjectId) => { await postOfferingSubject(offering().id, subjectId); await refetchSubjects(); }}
                  onRemove={async (subject) => { await deleteOfferingSubjectById(offering().id, subject.id); await refetchSubjects(); }}
                />
              </section>

              <section class={SECTION}>
                <div class={SECTION_HEAD}>
                  <div>
                    <h3 class="text-sm font-semibold">{t("weeklyPlan.title")}</h3>
                    <p class="text-xs text-muted-foreground">{t("offerings.weeklyPlanHelp")}</p>
                  </div>
                  <Show when={props.canEdit}>
                    <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setAddingSlot(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("weeklyPlan.addSlot")}
                    </Button>
                  </Show>
                </div>
                <WeeklyPlanTable
                  slots={slots.latest ?? []}
                  onRemove={props.canEdit ? (slot: WeeklySlot) => void guard(async () => { await deleteOfferingWeeklySlotById(offering().id, slot.id); await refetchSlots(); }) : undefined}
                />
              </section>

              <section class={SECTION}>
                <div class={SECTION_HEAD}>
                  <div>
                    <h3 class="text-sm font-semibold">{t("instances.examWeightsTitle")}</h3>
                    <p class="text-xs text-muted-foreground">{t("offerings.weightsHelp")}</p>
                  </div>
                  <Show when={props.canEdit}>
                    <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setWeightEditing("new")}>
                      <IconPlus class="h-4 w-4" />
                      {t("instances.addWeight")}
                    </Button>
                  </Show>
                </div>
                <ExamWeightsEditor
                  weights={weights.latest ?? []}
                  kinds={props.examKinds}
                  canEdit={props.canEdit}
                  editing={weightEditing()}
                  onEditingChange={setWeightEditing}
                  onSet={async (entry) => { await patchOfferingExamWeight(offering().id, entry); await refetchWeights(); }}
                  onRemove={async (kind) => { await deleteOfferingExamWeightByKind(offering().id, kind); await refetchWeights(); }}
                />
              </section>

              <WeeklySlotForm
                open={addingSlot()}
                onOpenChange={setAddingSlot}
                minMinute={props.limits?.weekly_plan.min_slot_minute}
                maxMinute={props.limits?.weekly_plan.max_slot_minute}
                maxTopicLen={props.limits?.course.max_session_topic_len}
                onSubmit={async (body) => { await postOfferingWeeklySlot(offering().id, body); await refetchSlots(); }}
              />
            </>
          )}
        </Show>
      </div>
    </SidePanel>
  );
}
