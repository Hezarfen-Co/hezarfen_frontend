import { For, Show, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { BankQuestion, BankVisibility, Course } from "@/api/client";
import {
  patchBankQuestionById,
  postBankChoiceImage,
  postBankQuestion,
  postBankQuestionImage,
} from "@/api/bank-questions";
import { getBankQuestionImageBlob } from "@/api/bank-questions";
import { getCourseSubjects } from "@/api/courses";
import { getSubjectById } from "@/api/subjects";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconUsers } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

/**
 * Create/edit a bank template. Wraps the shared `QuestionForm` with the
 * course→subject pick the bank needs (a template carries a subject id, but the
 * backend has no school-wide subject list — subjects are reached through a course).
 */
export function BankQuestionForm(props: {
  initial?: BankQuestion;
  /** A new template started from generated text, filed under this course. */
  draft?: { courseId: string; text: string };
  courses: Course[];
  onSaved: (question: BankQuestion) => void;
  onCancel: () => void;
}) {
  const t = useT();
  // Editing: resolve the template's subject to learn which course to preselect.
  const [initialCourse] = createResource(
    () => props.initial?.subject ?? null,
    async (subjectId) => (await getSubjectById(subjectId).catch(() => null))?.course ?? "",
  );
  const [courseId, setCourseId] = createSignal(props.draft?.courseId ?? "");
  // Editing keeps the template's own course even when it is not one of ours (it is
  // shown as a disabled option); only a new template falls back to the first course.
  const selectedCourse = () =>
    courseId() || initialCourse() || (props.initial ? "" : props.courses[0]?.id) || "";
  const originUnknown = () =>
    !!initialCourse() && !props.courses.some((course) => course.id === initialCourse());
  const [subjects] = createResource(
    () => selectedCourse() || null,
    async (id) => (await getCourseSubjects(id)).items,
  );

  // A template is private until its owner deliberately shares it; switching to
  // "school" waits on a confirmation dialog that spells out what that hands over.
  const [visibility, setVisibility] = createSignal<BankVisibility>("private");
  const [confirmShare, setConfirmShare] = createSignal<((shared: boolean) => void) | null>(null);
  createEffect(() => setVisibility(props.initial?.visibility ?? "private"));

  const imageBase = () => `/api/bank-questions/${props.initial?.id}`;

  const submit = async (values: QuestionValues) => {
    const { image, choice_images, ...body } = values;
    const existing = props.initial;

    // Sharing is the only irreversible half of this form — ask before anything is sent.
    const sharing = visibility() === "school" && existing?.visibility !== "school";
    if (sharing) {
      const confirmed = await new Promise<boolean>((resolve) => setConfirmShare(() => resolve));
      setConfirmShare(null);
      if (!confirmed) return;
    }

    // POST has no visibility field — a new template is always born private, so
    // sharing one is a follow-up PATCH.
    let saved = existing
      ? await patchBankQuestionById(existing.id, {
          ...body,
          ...(visibility() !== existing.visibility ? { visibility: visibility() } : {}),
        })
      : await postBankQuestion(body);
    if (sharing && !existing) saved = await patchBankQuestionById(saved.id, { visibility: "school" });
    if (image) await postBankQuestionImage(saved.id, image);
    // The saved choices come back in the submitted order, so the freshly picked
    // files line up with them — and every untouched option kept its own picture.
    for (const [index, file] of (choice_images ?? []).entries()) {
      const choiceId = saved.choices?.[index]?.id;
      if (file && choiceId) await postBankChoiceImage(saved.id, choiceId, file);
    }
    props.onSaved(saved);
  };

  return (
    <div class="space-y-4">
      <p class="rounded-md border border-border-line bg-surface-overlay px-3 py-2 text-xs text-text-subtle">
        {t("bank.copyNotice")}
      </p>

      <div class="space-y-1.5 rounded-xl border border-border-line bg-surface-overlay p-3.5">
        <Label for="bank-course" class="text-xs font-semibold text-muted-foreground">{t("nav.courses")}</Label>
        <Select
          id="bank-course"
          class="h-9 py-1.5 text-sm"
          value={selectedCourse()}
          onChange={(event) => setCourseId(event.currentTarget.value)}
        >
          <option value="">{t("bank.courseSelect")}</option>
          <Show when={originUnknown()}>
            <option value={initialCourse()} disabled>{t("bank.courseUnavailable")}</option>
          </Show>
          <For each={props.courses}>{(course) => <option value={course.id}>{course.title}</option>}</For>
        </Select>
        <p class="text-[11px] text-muted-foreground">{t("bank.courseHint")}</p>
      </div>

      <div class="space-y-1.5 rounded-xl border border-border-line bg-surface-overlay p-3.5">
        <Label for="bank-visibility" class="text-xs font-semibold text-muted-foreground">{t("bank.whoCanSee")}</Label>
        <Select
          id="bank-visibility"
          class="h-9 py-1.5 text-sm"
          value={visibility()}
          onChange={(event) => setVisibility(event.currentTarget.value as BankVisibility)}
        >
          <option value="private">{t("bank.onlyMe")}</option>
          <option value="school">{t("bank.sharedWithSchool")}</option>
        </Select>
        <p class="text-[11px] text-muted-foreground">
          {visibility() === "school" ? t("bank.sharedWithSchoolHint") : t("bank.onlyMeHint")}
        </p>
      </div>

      <QuestionForm
        initial={props.initial}
        draft={props.draft ? { text: props.draft.text, kind: "text" } : undefined}
        subjects={subjects() ?? []}
        subjectsPending={initialCourse.loading || subjects.loading}
        imageSrc={props.initial?.image ? `${imageBase()}/image` : undefined}
        choiceImageSrc={(choiceId) => `${imageBase()}/choices/${choiceId}/image`}
        loadImageBlob={props.initial ? () => getBankQuestionImageBlob(props.initial!.id) : undefined}
        onSubmit={submit}
        onCancel={props.onCancel}
      />

      <ConfirmDialog
        open={confirmShare() != null}
        onOpenChange={(open) => {
          if (!open) confirmShare()?.(false);
        }}
        title={t("bank.shareTitle")}
        description={t("bank.shareBody")}
        confirmLabel={t("bank.shareConfirm")}
        icon={<IconUsers class="h-4 w-4" />}
        summary={props.initial?.text || t("bank.sharedWithSchoolHint")}
        onConfirm={() => confirmShare()?.(true)}
      />
    </div>
  );
}
