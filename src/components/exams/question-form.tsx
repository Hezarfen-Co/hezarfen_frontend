import { For, Index, Show, createEffect, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { ExamQuestion, QuestionKind, Subject } from "@/api/client";
import { QUESTION_KINDS } from "@/api/client";
import { Button } from "@/components/ui/button";
import { IconCheck, IconFileImage, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

export type QuestionValues = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
  image: File | null;
  choice_images: (File | null)[] | null;
};

export function QuestionForm(props: {
  initial?: ExamQuestion;
  subjects: Subject[];
  onSubmit: (values: QuestionValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  let textAreaRef: HTMLTextAreaElement | undefined;
  const [text, setText] = createSignal(props.initial?.text ?? "");
  const [subjectId, setSubjectId] = createSignal(props.initial?.subject ?? props.subjects[0]?.id ?? "");
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [points, setPoints] = createSignal(String(props.initial?.points ?? 1));
  const [choices, setChoices] = createSignal<string[]>(props.initial?.choices ?? ["", "", "", ""]);
  const [correct, setCorrect] = createSignal(props.initial?.correct ?? 0);
  const [image, setImage] = createSignal<File | null>(null);
  const [choiceImages, setChoiceImages] = createSignal<(File | null)[]>(choices().map(() => null));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    const initial = props.initial;
    setText(initial?.text ?? "");
    setSubjectId(initial?.subject ?? props.subjects[0]?.id ?? "");
    setKind(initial?.kind ?? "choice");
    setPoints(String(initial?.points ?? 1));
    setChoices(initial?.choices ?? ["", "", "", ""]);
    setCorrect(initial?.correct ?? 0);
    setImage(null);
    setChoiceImages((initial?.choices ?? ["", "", "", ""]).map(() => null));
    setError("");
  });

  const resizeTextArea = () => {
    if (!textAreaRef) return;
    textAreaRef.style.height = "auto";
    textAreaRef.style.height = `${textAreaRef.scrollHeight}px`;
  };

  createEffect(() => {
    text();
    resizeTextArea();
  });

  const setChoice = (index: number, value: string) => {
    setChoices((current) => current.map((choice, i) => (i === index ? value : choice)));
  };

  const setChoiceImage = (index: number, file: File | null) => {
    setChoiceImages((current) => choices().map((_, i) => (i === index ? file : current[i] ?? null)));
  };

  const addChoice = () => {
    setChoices((current) => (current.length >= 10 ? current : [...current, ""]));
    setChoiceImages((current) => (current.length >= 10 ? current : [...current, null]));
  };

  const removeChoice = (index: number) => {
    setChoices((current) => current.filter((_, i) => i !== index));
    setChoiceImages((current) => current.filter((_, i) => i !== index));
    setCorrect((current) => Math.max(0, Math.min(current, choices().length - 2)));
  };

  const validate = (): QuestionValues | string => {
    const body = text().trim();
    const subject = subjectId().trim();
    if (!subject) return t("questions.subjectRequired");
    if (!body) return t("questions.textRequired");
    if (body.length > 2000) return t("form.descriptionMax");
    const p = Number(points());
    if (!Number.isInteger(p) || p < 1 || p > 100) return t("questions.pointsRange");
    if (kind() === "text") {
      return { subject_id: subject, text: body, kind: "text", points: p, choices: null, correct: null, image: image(), choice_images: null };
    }
    const indexedChoices = choices()
      .map((choice, index) => ({ choice: choice.trim(), image: choiceImages()[index] ?? null }))
      .filter((item) => item.choice);
    const cleanChoices = indexedChoices.map((item) => item.choice);
    if (cleanChoices.length < 2 || cleanChoices.length > 10 || cleanChoices.some((choice) => choice.length > 500)) {
      return t("questions.choicesRange");
    }
    const c = correct();
    if (!Number.isInteger(c) || c < 0 || c >= cleanChoices.length) return t("questions.correctRange");
    return { subject_id: subject, text: body, kind: "choice", points: p, choices: cleanChoices, correct: c, image: image(), choice_images: indexedChoices.map((item) => item.image) };
  };

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const values = validate();
    if (typeof values === "string") {
      setError(values);
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form class="space-y-3" onSubmit={(e) => void submit(e)}>
      <div class="rounded-lg border bg-card p-3.5 shadow-sm">
        <div class="space-y-2">
          <Label for="question-text" class="text-sm font-semibold">{t("questions.text")}</Label>
          <Textarea
            id="question-text"
            ref={textAreaRef}
            class="min-h-[7rem] resize-none overflow-hidden bg-background text-base"
            value={text()}
            maxlength={2000}
            rows={3}
            required
            placeholder={t("questions.text")}
            onInput={(e) => {
              setText(e.currentTarget.value);
              resizeTextArea();
            }}
          />
          <div class="flex items-center gap-3">
            <Show when={props.initial?.image}>
              <div class="relative shrink-0">
                <img
                  src={`/api/exams/${props.initial!.exam}/questions/${props.initial!.id}/image`}
                  alt={t("questions.image")}
                  class="h-14 w-24 rounded border bg-muted/20 object-contain"
                />
              </div>
            </Show>
            <div class="flex items-center gap-2">
              <input
                id="question-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                class="sr-only"
                onChange={(event) => setImage(event.currentTarget.files?.[0] ?? null)}
              />
              <label for="question-image" class="flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                <IconFileImage class="h-3.5 w-3.5" />
                <span class="truncate">{image()?.name ?? t("questions.image")}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-3.5 py-3 shadow-sm">
        <div class="min-w-0 flex-1 basis-[10rem]">
          <Label for="question-subject" class="mb-1 block text-xs font-semibold text-muted-foreground">{t("subjects.subject")}</Label>
          <Select id="question-subject" class="h-9 py-1.5 text-sm" value={subjectId()} required onChange={(e) => setSubjectId(e.currentTarget.value)}>
            <option value="">{t("subjects.select")}</option>
            <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
          </Select>
        </div>
        <div>
          <Label class="mb-1 block text-xs font-semibold text-muted-foreground">{t("questions.kind")}</Label>
          <div class="flex gap-0.5 rounded-md border bg-muted/40 p-0.5">
            <For each={QUESTION_KINDS}>
              {(k) => (
                <button
                  type="button"
                  class={cn(
                    "h-7 rounded-sm px-2.5 text-xs font-semibold transition-colors",
                    kind() === k
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setKind(k)}
                >
                  {k === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                </button>
              )}
            </For>
          </div>
        </div>
        <div class="w-20">
          <Label for="question-points" class="mb-1 block text-xs font-semibold text-muted-foreground">{t("questions.points")}</Label>
          <Input
            id="question-points"
            type="number"
            min={1}
            max={100}
            value={points()}
            class="h-9 text-sm"
            required
            onInput={(e) => setPoints(e.currentTarget.value)}
          />
        </div>
      </div>

      <Show when={kind() === "choice"}>
        <div class="rounded-lg border bg-card p-3.5 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-2 border-b border-border/50 pb-2">
            <Label class="text-sm font-semibold">{t("questions.choices")}</Label>
            <Button type="button" variant="outline" size="sm" class="h-7 gap-1 text-xs" disabled={choices().length >= 10} onClick={addChoice}>
              <IconPlus class="h-3.5 w-3.5" />
              {t("questions.addChoice")}
            </Button>
          </div>
          <div class="space-y-2">
            <Index each={choices()}>
              {(choice, index) => {
                const isCorrect = () => correct() === index;
                return (
                  <div
                    class={cn(
                      "flex items-start gap-2 rounded-md border p-2 transition-colors",
                      isCorrect() ? "border-emerald-400/60 bg-emerald-50/60" : "border-border bg-background",
                    )}
                  >
                    <button
                      type="button"
                      class={cn(
                        "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold transition-colors",
                        isCorrect()
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border bg-background text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
                      )}
                      onClick={() => setCorrect(index)}
                      title={t("questions.correct")}
                    >
                      {isCorrect() ? <IconCheck class="h-3.5 w-3.5" /> : String.fromCharCode(65 + index)}
                    </button>
                    <div class="min-w-0 flex-1 space-y-1.5">
                      <Input
                        class="h-8 text-sm"
                        value={choice()}
                        maxlength={500}
                        placeholder={t("questions.choicePlaceholder", { index: String.fromCharCode(65 + index) })}
                        onInput={(e) => setChoice(index, e.currentTarget.value)}
                      />
                      <div class="flex items-center gap-2">
                        <input
                          id={`choice-image-${index}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          class="sr-only"
                          onChange={(event) => setChoiceImage(index, event.currentTarget.files?.[0] ?? null)}
                        />
                        <label for={`choice-image-${index}`} class="flex cursor-pointer items-center gap-1 rounded-md border border-dashed bg-muted/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                          <IconFileImage class="h-3 w-3" />
                          {choiceImages()[index]?.name ?? t("questions.choiceImage")}
                        </label>
                        <Show when={props.initial?.choice_images?.[index]}>
                          <img
                            src={`/api/exams/${props.initial!.exam}/questions/${props.initial!.id}/choices/${index}/image`}
                            alt={t("questions.choiceImage")}
                            class="h-8 w-12 rounded border bg-muted/20 object-contain"
                          />
                        </Show>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={choices().length <= 2}
                      class="mt-0.5 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeChoice(index)}
                    >
                      <IconTrash class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              }}
            </Index>
          </div>
        </div>
      </Show>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-1.5 text-sm text-destructive">{error()}</p>}

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" class="h-8 text-xs font-semibold" disabled={pending()}>
          {props.initial ? t("common.update") : t("common.create")}
        </Button>
        <Button type="button" variant="outline" class="h-8 text-xs font-semibold" onClick={props.onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
