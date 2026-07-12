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
import { IconPlus, IconTrash } from "@/components/ui/icons";
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
  const [text, setText] = createSignal(props.initial?.text ?? "");
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [points, setPoints] = createSignal(String(props.initial?.points ?? 1));
  const [choicesText, setChoicesText] = createSignal((props.initial?.choices ?? ["", ""]).join("\n"));
  const [correct, setCorrect] = createSignal(props.initial?.correct != null ? String(props.initial.correct) : "0");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    const initial = props.initial;
    setText(initial?.text ?? "");
    setKind(initial?.kind ?? "choice");
    setPoints(String(initial?.points ?? 1));
    setChoicesText((initial?.choices ?? ["", ""]).join("\n"));
    setCorrect(initial?.correct != null ? String(initial.correct) : "0");
    setError("");
  });

  const validate = (): QuestionValues | string => {
    const body = text().trim();
    if (!body) return t("questions.textRequired");
    if (body.length > 2000) return t("form.descriptionMax");
    const p = Number(points());
    if (!Number.isInteger(p) || p < 1 || p > 100) return t("questions.pointsRange");
    if (kind() === "text") {
      return { text: body, kind: "text", points: p, choices: null, correct: null };
    }
    const choices = choicesText().split("\n").map((choice) => choice.trim()).filter(Boolean);
    if (choices.length < 2 || choices.length > 10 || choices.some((choice) => choice.length > 500)) {
      return t("questions.choicesRange");
    }
    const c = Number(correct());
    if (!Number.isInteger(c) || c < 0 || c >= choices.length) return t("questions.correctRange");
    return { text: body, kind: "choice", points: p, choices, correct: c };
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
    <form class="space-y-3 rounded-md border p-4" onSubmit={(e) => void submit(e)}>
      <div class="space-y-1.5">
        <Label for="question-text">{t("questions.text")}</Label>
        <Textarea id="question-text" value={text()} maxlength={2000} rows={4} required onInput={(e) => setText(e.currentTarget.value)} />
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="space-y-1.5">
          <Label for="question-kind">{t("questions.kind")}</Label>
          <Select id="question-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as QuestionKind)}>
            <For each={QUESTION_KINDS}>
              {(k) => <option value={k}>{k === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}</option>}
            </For>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label for="question-points">{t("questions.points")}</Label>
          <Input id="question-points" type="number" min={1} max={100} value={points()} required onInput={(e) => setPoints(e.currentTarget.value)} />
        </div>
        <Show when={kind() === "choice"}>
          <div class="space-y-1.5">
            <Label for="question-correct">{t("questions.correct")}</Label>
            <Input id="question-correct" type="number" min={0} value={correct()} required onInput={(e) => setCorrect(e.currentTarget.value)} />
            <p class="text-xs text-muted-foreground">{t("questions.correctHint")}</p>
          </div>
        </Show>
      </div>
      <Show when={kind() === "choice"}>
        <div class="space-y-1.5">
          <Label for="question-choices">{t("questions.choices")}</Label>
          <Textarea id="question-choices" value={choicesText()} rows={5} onInput={(e) => setChoicesText(e.currentTarget.value)} />
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
