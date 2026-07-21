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
    <form class="mx-auto max-w-5xl space-y-3 rounded-md border bg-muted/20 p-3" onSubmit={(e) => void submit(e)}>
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-stretch">
        <div class="space-y-1.5">
          <Label for="question-text" class="text-sm font-semibold">{t("questions.text")}</Label>
          <Textarea
            id="question-text"
            ref={textAreaRef}
            class="min-h-[10rem] resize-none overflow-hidden bg-background text-base"
            value={text()}
            maxlength={2000}
            rows={5}
            required
            placeholder={t("questions.text")}
            onInput={(e) => {
              setText(e.currentTarget.value);
              resizeTextArea();
            }}
          />
          <div class="mt-2 rounded-lg border bg-background p-3 shadow-sm">
            <Label for="question-image" class="text-xs font-semibold text-muted-foreground">{t("questions.image")}</Label>
            <Show when={props.initial?.image}>
              <img
                src={`/api/exams/${props.initial!.exam}/questions/${props.initial!.id}/image`}
                alt={t("questions.image")}
                class="mt-2 h-40 w-full max-w-md rounded-md border bg-muted/20 object-contain"
              />
            </Show>
            <input
              id="question-image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="sr-only"
              onChange={(event) => setImage(event.currentTarget.files?.[0] ?? null)}
            />
            <label for="question-image" class="mt-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
              <IconFileImage class="h-4 w-4" />
              <span class="truncate">{image()?.name ?? t("common.createItem", { item: t("questions.image") })}</span>
            </label>
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label class="text-sm font-semibold">{t("questions.kind")}</Label>
          <div class="flex flex-1 flex-col gap-3 rounded-lg border bg-background p-3 shadow-sm">
            <div class="space-y-1.5">
              <Label for="question-subject">{t("subjects.subject")}</Label>
              <Select id="question-subject" class="h-10 py-2" value={subjectId()} required onChange={(e) => setSubjectId(e.currentTarget.value)}>
                <option value="">{t("subjects.select")}</option>
                <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
              </Select>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1 pt-2">
              <For each={QUESTION_KINDS}>
                {(k) => (
                  <button
                    type="button"
                    class={cn(
                      "h-9 rounded-md border text-xs font-semibold transition-colors",
                      kind() === k
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                    onClick={() => setKind(k)}
                  >
                    {k === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                  </button>
                )}
              </For>
              <Select id="question-kind" value={kind()} class="sr-only" onChange={(e) => setKind(e.currentTarget.value as QuestionKind)}>
                <For each={QUESTION_KINDS}>
                  {(k) => <option value={k}>{k === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}</option>}
                </For>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label for="question-points">{t("questions.points")}</Label>
              <Input
                id="question-points"
                type="number"
                min={1}
                max={100}
                value={points()}
                class="h-10"
                required
                onInput={(e) => setPoints(e.currentTarget.value)}
              />
            </div>
          </div>
        </div>
      </div>
      <Show when={kind() === "choice"}>
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div>
              <Label class="text-sm font-semibold">{t("questions.choices")}</Label>
              <p class="text-xs text-muted-foreground">{t("questions.correctAnswer")}: {String.fromCharCode(65 + correct())}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={choices().length >= 10} onClick={addChoice}>
              <IconPlus class="h-4 w-4" />
              {t("questions.addChoice")}
            </Button>
          </div>
          <div class="grid gap-3 xl:grid-cols-2">
            <Index each={choices()}>
              {(choice, index) => (
                <div class="min-h-28 rounded-md border bg-background p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      class={
                        correct() === index
                          ? "inline-flex h-8 items-center gap-2 rounded-sm bg-primary px-2 text-xs font-medium text-primary-foreground"
                          : "inline-flex h-8 items-center gap-2 rounded-sm border px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                      }
                      onClick={() => setCorrect(index)}
                    >
                      <span class="inline-flex h-5 w-5 items-center justify-center rounded-[3px] border bg-background text-foreground">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {correct() === index ? <IconCheck class="h-3.5 w-3.5" /> : t("questions.correct")}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={choices().length <= 2}
                      class="h-8 px-2 text-destructive"
                      onClick={() => removeChoice(index)}
                    >
                      <IconTrash class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    class="h-10"
                    value={choice()}
                    maxlength={500}
                    placeholder={t("questions.choicePlaceholder", { index: String.fromCharCode(65 + index) })}
                    onInput={(e) => setChoice(index, e.currentTarget.value)}
                  />
                  <Show when={props.initial?.choice_images?.[index]}>
                    <img
                      src={`/api/exams/${props.initial!.exam}/questions/${props.initial!.id}/choices/${index}/image`}
                      alt={t("questions.choiceImage")}
                      class="mt-2 h-32 w-full max-w-sm rounded-md border bg-muted/20 object-contain"
                    />
                  </Show>
                  <div class="mt-2">
                    <Label for={`choice-image-${index}`} class="text-xs font-semibold text-muted-foreground">{t("questions.choiceImage")}</Label>
                    <input
                      id={`choice-image-${index}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      class="sr-only"
                      onChange={(event) => setChoiceImage(index, event.currentTarget.files?.[0] ?? null)}
                    />
                    <label for={`choice-image-${index}`} class="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                      <IconFileImage class="h-4 w-4" />
                      <span class="truncate">{choiceImages()[index]?.name ?? t("common.createItem", { item: t("questions.choiceImage") })}</span>
                    </label>
                  </div>
                </div>
              )}
            </Index>
          </div>
        </div>
      </Show>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending()}>
          {props.initial ? t("common.update") : t("common.create")}
        </Button>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
