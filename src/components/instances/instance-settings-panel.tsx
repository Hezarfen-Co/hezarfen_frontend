import { Show, createEffect, createSignal } from "solid-js";
import {
  deleteInstanceExamWeightByKind,
  deleteInstanceExamWeights,
  deleteInstanceSubjectById,
  deleteInstanceSubjects,
  patchInstanceById,
  patchInstanceExamWeight,
  postInstanceReset,
  postInstanceSubject,
} from "@/api/instances";
import { formatApiError, type ExamWeightEntry, type Instance, type InstanceOverrideField, type Subject } from "@/api/client";
import { ExamWeightsEditor } from "@/components/instances/exam-weights-editor";
import { OverrideBadge } from "@/components/instances/override-badge";
import { SubjectSetEditor } from "@/components/instances/subject-set-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataSection } from "@/components/ui/data-section";
import { IconEdit, IconPlus, IconRotateCcw } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

type ResetTarget = { fields: InstanceOverrideField[]; label: string; run?: () => Promise<void> };

/**
 * What a section overrides of its grade template: title/description, hours
 * and the karne flag, the topic set and the exam weights. Every value is the
 * resolved one; a badge tells an own override from an inherited value, and
 * "reset" hands a field back to the template.
 */
export function InstanceSettingsPanel(props: {
  instance: Instance;
  canManage: boolean;
  /** The catalog course's subjects — what a section's own set may hold. */
  courseSubjects: Subject[];
  /** settings.exam_kinds names. */
  examKinds: string[];
  maxTitleLen?: number;
  maxDescriptionLen?: number;
  onChanged: () => unknown;
}) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [editingContent, setEditingContent] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [contentError, setContentError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [reset, setReset] = createSignal<ResetTarget | null>(null);
  const [weightEditing, setWeightEditing] = createSignal<ExamWeightEntry | "new" | null>(null);

  createEffect(() => {
    if (!editingContent()) return;
    setTitle(props.instance.title);
    setDescription(props.instance.description);
    setContentError("");
  });

  const act = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await action();
      await props.onChanged();
    } catch (err) {
      setError(formatApiError(err));
      throw err;
    }
  };

  // For editors that show their own error: write, then reload the instance.
  const mutate = async (action: () => Promise<unknown>) => {
    await action();
    await props.onChanged();
  };

  const saveContent = async (event: SubmitEvent) => {
    event.preventDefault();
    const nextTitle = title().trim();
    if (!nextTitle) {
      setContentError(t("form.fieldRequired"));
      return;
    }
    // PATCH only what changed: sending an unchanged inherited value would
    // silently freeze it as the section's own override.
    const body: { title?: string; description?: string } = {};
    if (nextTitle !== props.instance.title) body.title = nextTitle;
    if (description().trim() !== props.instance.description) body.description = description().trim();
    if (!body.title && body.description === undefined) {
      setEditingContent(false);
      return;
    }
    setPending(true);
    try {
      await patchInstanceById(props.instance.id, body);
      await props.onChanged();
      setEditingContent(false);
    } catch (err) {
      setContentError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const resetButton = (target: ResetTarget) => (
    <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setReset(target)}>
      <IconRotateCcw class="h-4 w-4" />
      {t("override.reset")}
    </Button>
  );

  const row = (label: string, value: string, own: boolean, field: InstanceOverrideField) => (
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline py-2.5 last:border-b-0">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-text-subtle">{label}</p>
        <p class="truncate text-sm text-text-default" title={value}>{value || "—"}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <OverrideBadge own={own} />
        <Show when={props.canManage && own}>
          {resetButton({ fields: [field], label })}
        </Show>
      </div>
    </div>
  );

  return (
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">{t("instances.settingsHelp")}</p>
      <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>

      <DataSection
        title={t("instances.contentTitle")}
        description={t("instances.contentHelp")}
        actions={
          <Show when={props.canManage}>
            <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setEditingContent(true)}>
              <IconEdit class="h-4 w-4" />
              {t("instances.editContent")}
            </Button>
          </Show>
        }
      >
        <div>
          {row(t("form.title"), props.instance.title, props.instance.title_overridden, "title")}
          {row(t("form.description"), props.instance.description, props.instance.description_overridden, "description")}
        </div>
      </DataSection>

      <DataSection title={t("instances.policyTitle")}>
        <div>
          {row(t("instances.dersSaati"), String(props.instance.ders_saati), props.instance.ders_saati_overridden, "ders_saati")}
          {row(t("instances.countsTowardKarne"), props.instance.counts_toward_karne ? t("common.yes") : t("common.no"), props.instance.counts_toward_karne_overridden, "counts_toward_karne")}
        </div>
      </DataSection>

      <DataSection
        title={t("instances.subjectsTitle")}
        description={`${t("instances.subjectsHelp")} ${props.instance.subjects_inherited ? t("instances.subjectsInheritedHint") : t("instances.subjectsOwnHint")}`}
        actions={
          <Show when={props.canManage && !props.instance.subjects_inherited}>
            {resetButton({ fields: ["subjects"], label: t("instances.subjectsTitle"), run: () => deleteInstanceSubjects(props.instance.id) })}
          </Show>
        }
      >
        <OverrideBadge own={!props.instance.subjects_inherited} />
        <SubjectSetEditor
          selected={props.instance.subjects}
          available={props.courseSubjects}
          canEdit={props.canManage}
          onAdd={(subjectId) => mutate(() => postInstanceSubject(props.instance.id, subjectId))}
          onRemove={(subject) => mutate(() => deleteInstanceSubjectById(props.instance.id, subject.id))}
        />
      </DataSection>

      <DataSection
        title={t("instances.examWeightsTitle")}
        description={`${t("instances.examWeightsHelp")} ${props.instance.exam_weights_inherited ? t("instances.examWeightsInheritedHint") : t("instances.examWeightsOwnHint")}`}
        actions={
          <Show when={props.canManage}>
            <Show when={!props.instance.exam_weights_inherited}>
              {resetButton({ fields: ["exam_weights"], label: t("instances.examWeightsTitle"), run: () => deleteInstanceExamWeights(props.instance.id) })}
            </Show>
            <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setWeightEditing("new")}>
              <IconPlus class="h-4 w-4" />
              {t("instances.addWeight")}
            </Button>
          </Show>
        }
      >
        <OverrideBadge own={!props.instance.exam_weights_inherited} />
        <ExamWeightsEditor
          weights={props.instance.exam_weights}
          kinds={props.examKinds}
          canEdit={props.canManage}
          editing={weightEditing()}
          onEditingChange={setWeightEditing}
          onSet={(entry) => mutate(() => patchInstanceExamWeight(props.instance.id, entry))}
          onRemove={props.instance.exam_weights_inherited ? undefined : (kind) => mutate(() => deleteInstanceExamWeightByKind(props.instance.id, kind))}
        />
      </DataSection>

      <SidePanel guardUnsaved open={editingContent()} onOpenChange={setEditingContent} title={t("instances.editContent")} description={t("instances.contentHelp")}>
        <form class="space-y-4" noValidate onSubmit={saveContent}>
          <div class="space-y-1.5">
            <Label for="instance-title">{t("form.title")}</Label>
            <Input id="instance-title" maxlength={props.maxTitleLen} value={title()} error={contentError() && !title().trim() ? contentError() : undefined} onInput={(e) => setTitle(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="instance-description">{t("form.description")}</Label>
            <Textarea id="instance-description" rows={4} maxlength={props.maxDescriptionLen} value={description()} onInput={(e) => setDescription(e.currentTarget.value)} />
          </div>
          <Show when={contentError() && title().trim()}><Alert variant="destructive">{contentError()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4">
            <Button type="submit" disabled={pending()}>{t("common.save")}</Button>
            <Button type="button" variant="outline" onClick={() => setEditingContent(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={reset() !== null}
        onOpenChange={(open) => !open && setReset(null)}
        title={t("override.resetConfirmTitle")}
        description={t("override.resetConfirmHint")}
        summary={reset()?.label ?? ""}
        confirmLabel={t("override.reset")}
        onConfirm={async () => {
          const target = reset();
          if (!target) return;
          await act(() => (target.run ? target.run() : postInstanceReset(props.instance.id, target.fields))).catch(() => undefined);
          setReset(null);
        }}
      />
    </div>
  );
}
