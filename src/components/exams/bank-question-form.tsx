import { For, Show, createResource, createSignal } from "solid-js";
import type { BankQuestion, Course } from "@/api/client";
import {
  getBankChoiceImageBlob,
  patchBankQuestionById,
  postBankChoiceImage,
  postBankQuestion,
  postBankQuestionImage,
} from "@/api/bank-questions";
import { getBankQuestionImageBlob } from "@/api/bank-questions";
import { getCourseSubjects } from "@/api/courses";
import { getSubjectById } from "@/api/subjects";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { planChoiceImageRestore } from "@/lib/choice-compaction";
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
  courses: Course[];
  /** `imagesLost` is set when an option image could not be carried over the edit. */
  onSaved: (question: BankQuestion, imagesLost?: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  // Editing: resolve the template's subject to learn which course to preselect.
  const [initialCourse] = createResource(
    () => props.initial?.subject ?? null,
    async (subjectId) => (await getSubjectById(subjectId).catch(() => null))?.course ?? "",
  );
  const [courseId, setCourseId] = createSignal("");
  const selectedCourse = () => courseId() || initialCourse() || props.courses[0]?.id || "";
  const [subjects] = createResource(
    () => selectedCourse() || null,
    async (id) => (await getCourseSubjects(id)).items,
  );

  const imageBase = () => `/api/bank-questions/${props.initial?.id}`;

  const submit = async (values: QuestionValues) => {
    const { image, choice_images, choice_sources, ...body } = values;
    const existing = props.initial;

    // PATCH with a `choices` key wipes every stored option image server-side, so
    // fetch the ones the user is keeping first and put them back afterwards.
    // `choice_sources` maps each surviving choice to the option it came from,
    // because blank choices are dropped and would otherwise shift the indices.
    const lost: number[] = [];
    const keep: { index: number; file: File }[] = [];
    if (existing && body.kind === "choice") {
      const plan = planChoiceImageRestore(choice_sources ?? [], existing.choice_images ?? [], choice_images);
      for (const slot of plan) {
        try {
          const blob = await getBankChoiceImageBlob(existing.id, slot.source);
          keep.push({ index: slot.index, file: new File([blob], `choice-${slot.source}`, { type: blob.type }) });
        } catch {
          lost.push(slot.index); // the PATCH below deletes it regardless — say so
        }
      }
    }

    const saved = existing
      ? await patchBankQuestionById(existing.id, body)
      : await postBankQuestion(body);
    if (image) await postBankQuestionImage(saved.id, image);
    for (const [index, file] of (choice_images ?? []).entries()) {
      if (file) await postBankChoiceImage(saved.id, index, file);
    }
    // One failed restore must not abandon the rest: upload each independently.
    for (const slot of keep) {
      try {
        await postBankChoiceImage(saved.id, slot.index, slot.file);
      } catch {
        lost.push(slot.index);
      }
    }
    props.onSaved(
      saved,
      lost.length > 0
        ? t("questions.imagesLost", { options: lost.sort((a, b) => a - b).map((index) => String.fromCharCode(65 + index)).join(", ") })
        : undefined,
    );
  };

  return (
    <div class="space-y-4">
      <p class="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-muted-foreground">
        {t("bank.copyNotice")}
      </p>

      <div class="space-y-1.5 rounded-lg border bg-card p-3.5 shadow-xs">
        <Label for="bank-course" class="text-xs font-semibold text-muted-foreground">{t("nav.courses")}</Label>
        <Select
          id="bank-course"
          class="h-9 py-1.5 text-sm"
          value={selectedCourse()}
          onChange={(event) => setCourseId(event.currentTarget.value)}
        >
          <For each={props.courses}>{(course) => <option value={course.id}>{course.title}</option>}</For>
        </Select>
        <p class="text-[11px] text-muted-foreground">{t("bank.courseHint")}</p>
      </div>

      <Show when={props.initial?.choice_images?.some(Boolean)}>
        <p class="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
          {t("bank.choiceImagesWarning")}
        </p>
      </Show>

      <QuestionForm
        initial={props.initial}
        subjects={subjects() ?? []}
        imageSrc={props.initial?.image ? `${imageBase()}/image` : undefined}
        choiceImageSrc={(index) => `${imageBase()}/choices/${index}/image`}
        loadImageBlob={props.initial ? () => getBankQuestionImageBlob(props.initial!.id) : undefined}
        onSubmit={submit}
        onCancel={props.onCancel}
      />
    </div>
  );
}
