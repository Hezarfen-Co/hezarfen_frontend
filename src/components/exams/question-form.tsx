import { For, Index, Show, createEffect, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { ExamQuestion, QuestionKind, Subject } from "@/api/types";
import { QUESTION_KINDS } from "@/api/types";
import { Button } from "@/components/ui/button";
import { IconCheck, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

export type QuestionValues = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
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

  const addChoice = () => {
    setChoices((current) => (current.length >= 10 ? current : [...current, ""]));
  };

  const removeChoice = (index: number) => {
    setChoices((current) => current.filter((_, i) => i !== index));
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
      return { subject_id: subject, text: body, kind: "text", points: p, choices: null, correct: null };
    }
    const cleanChoices = choices().map((choice) => choice.trim()).filter(Boolean);
    if (cleanChoices.length < 2 || cleanChoices.length > 10 || cleanChoices.some((choice) => choice.length > 500)) {
      return t("questions.choicesRange");
    }
    const c = correct();
    if (!Number.isInteger(c) || c < 0 || c >= cleanChoices.length) return t("questions.correctRange");
    return { subject_id: subject, text: body, kind: "choice", points: p, choices: cleanChoices, correct: c };
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
        </div>
        <div class="space-y-1.5">
          <Label for="question-kind" class="text-sm font-semibold">{t("questions.kind")}</Label>
          <div class="flex h-[10rem] min-h-[10rem] flex-col justify-between rounded-md border bg-background p-3">
            <div class="space-y-1.5">
              <Label for="question-subject">{t("subjects.subject")}</Label>
              <Select id="question-subject" value={subjectId()} required onChange={(e) => setSubjectId(e.currentTarget.value)}>
                <option value="">{t("subjects.select")}</option>
                <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Select id="question-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as QuestionKind)}>
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
                </div>
              )}
            </Index>
          </div>
          <p class="text-xs text-muted-foreground">{t("questions.choicesHint")}</p>
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
