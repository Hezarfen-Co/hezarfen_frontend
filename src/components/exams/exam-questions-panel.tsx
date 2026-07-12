import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamQuestionById } from "@/api/deleteExamQuestionById";
import { getExamQuestions } from "@/api/getExamQuestions";
import { patchExamQuestionById } from "@/api/patchExamQuestionById";
import { postExamQuestion } from "@/api/postExamQuestion";
import { ApiError, formatApiError } from "@/api/client";
import type { ExamQuestion, QuestionKind } from "@/api/types";
import { QUESTION_KINDS } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconCheck, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

type QuestionValues = {
  text: string;
  kind: QuestionKind;
  points: number;
  choices: string[] | null;
  correct: number | null;
};

export function ExamQuestionsPanel(props: { examId: string }) {
  const t = useT();
  const [questions, { refetch }] = createResource(() => props.examId, async (examId) => {
    try {
      return await getExamQuestions(examId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  });
  const [showForm, setShowForm] = createSignal(false);
  const [editing, setEditing] = createSignal<ExamQuestion | null>(null);
  const [removeQuestion, setRemoveQuestion] = createSignal<ExamQuestion | null>(null);
  const [error, setError] = createSignal("");

  const formInitial = createMemo(() => editing() ?? undefined);

  const submit = async (values: QuestionValues) => {
    setError("");
    try {
      const q = editing();
      if (q) {
        await patchExamQuestionById(props.examId, q.id, values);
      } else {
        await postExamQuestion(props.examId, values);
      }
      setEditing(null);
      setShowForm(false);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <section class="surface-card space-y-4 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg font-semibold">{t("questions.title")}</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(null);
            setShowForm((v) => !v);
          }}
        >
          <IconPlus class="h-4 w-4" />
          {t("questions.add")}
        </Button>
      </div>

      <Show when={showForm() || editing()}>
        <QuestionForm
          initial={formInitial()}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          onSubmit={submit}
        />
      </Show>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show
          when={(questions() ?? []).length > 0}
          fallback={<p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">{t("questions.empty")}</p>}
        >
          <ol class="space-y-3">
            <For each={questions() ?? []}>
              {(q, index) => (
                <li class="rounded-md border p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-semibold text-muted-foreground">#{index() + 1}</span>
                        <Badge variant="outline" class="capitalize">
                          {q.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                        </Badge>
                        <Badge variant="outline">{q.points} {t("questions.points")}</Badge>
                      </div>
                      <p class="whitespace-pre-wrap text-sm font-medium">{q.text}</p>
                      <Show when={q.kind === "choice" && q.choices}>
                        <ol class="grid gap-1 text-sm text-muted-foreground">
                          <For each={q.choices ?? []}>
                            {(choice, choiceIndex) => (
                              <li class={choiceIndex() === q.correct ? "font-medium text-foreground" : undefined}>
                                {choiceIndex()}. {choice}
                              </li>
                            )}
                          </For>
                        </ol>
                      </Show>
                    </div>
                    <div class="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(q)}>
                        {t("common.edit")}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" class="text-destructive" onClick={() => setRemoveQuestion(q)}>
                        <IconTrash class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              )}
            </For>
          </ol>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={removeQuestion() != null}
        onOpenChange={(open) => {
          if (!open) setRemoveQuestion(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={removeQuestion()?.text ?? ""}
        onConfirm={async () => {
          const q = removeQuestion();
          if (!q) return;
          setError("");
          try {
            await deleteExamQuestionById(props.examId, q.id);
            await refetch();
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setRemoveQuestion(null);
          }
        }}
      />
    </section>
  );
}

function QuestionForm(props: {
  initial?: ExamQuestion;
  onSubmit: (values: QuestionValues) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  let textAreaRef: HTMLTextAreaElement | undefined;
  const [text, setText] = createSignal(props.initial?.text ?? "");
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [points, setPoints] = createSignal(String(props.initial?.points ?? 1));
  const [choices, setChoices] = createSignal<string[]>(props.initial?.choices ?? ["", "", "", ""]);
  const [correct, setCorrect] = createSignal(props.initial?.correct ?? 0);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    const initial = props.initial;
    setText(initial?.text ?? "");
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
    if (!body) return t("questions.textRequired");
    if (body.length > 2000) return t("form.descriptionMax");
    const p = Number(points());
    if (!Number.isInteger(p) || p < 1 || p > 100) return t("questions.pointsRange");
    if (kind() === "text") {
      return { text: body, kind: "text", points: p, choices: null, correct: null };
    }
    const cleanChoices = choices().map((choice) => choice.trim()).filter(Boolean);
    if (cleanChoices.length < 2 || cleanChoices.length > 10 || cleanChoices.some((choice) => choice.length > 500)) {
      return t("questions.choicesRange");
    }
    const c = correct();
    if (!Number.isInteger(c) || c < 0 || c >= cleanChoices.length) return t("questions.correctRange");
    return { text: body, kind: "choice", points: p, choices: cleanChoices, correct: c };
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
            <For each={choices()}>
              {(choice, index) => (
                <div class="min-h-28 rounded-md border bg-background p-3">
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      class={
                        correct() === index()
                          ? "inline-flex h-8 items-center gap-2 rounded-sm bg-primary px-2 text-xs font-medium text-primary-foreground"
                          : "inline-flex h-8 items-center gap-2 rounded-sm border px-2 text-xs font-medium text-muted-foreground hover:bg-accent"
                      }
                      onClick={() => setCorrect(index())}
                    >
                      <span class="inline-flex h-5 w-5 items-center justify-center rounded-[3px] border bg-background text-foreground">
                        {String.fromCharCode(65 + index())}
                      </span>
                      {correct() === index() ? <IconCheck class="h-3.5 w-3.5" /> : t("questions.correct")}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={choices().length <= 2}
                      class="h-8 px-2 text-destructive"
                      onClick={() => removeChoice(index())}
                    >
                      <IconTrash class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    class="h-10"
                    value={choice}
                    maxlength={500}
                    placeholder={t("questions.choicePlaceholder", { index: String.fromCharCode(65 + index()) })}
                    onInput={(e) => setChoice(index(), e.currentTarget.value)}
                  />
                </div>
              )}
            </For>
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
