// Question authoring for whoever manages the exam's course. Choice questions
// carry 2–10 options with the right one picked by radio; text questions are
// free-form and graded by a human. The backend freezes the list the moment
// anyone starts an attempt — that lands here as an error line, not a crash.

import { For, Show, createResource, createSignal } from "solid-js";
import { createAction } from "../lib/action";
import { exams } from "../lib/api";
import { t } from "../lib/i18n";
import { LIMITS, type ExamQuestion, type QuestionKind } from "../lib/types";
import { ConfirmButton } from "./ConfirmButton";
import { Empty, ErrorLine, Loading } from "./Feedback";
import { IconPlus } from "./Icons";

interface QuestionDraft {
  text: string;
  kind: string;
  points: number;
  choices: string[] | null;
  correct: number | null;
}

export function ExamQuestions(props: { examId: string }) {
  const [list, { mutate }] = createResource(() => props.examId, exams.questions);
  const [adding, setAdding] = createSignal(false);
  const [editing, setEditing] = createSignal<string | null>(null);

  const create = createAction(async (draft: QuestionDraft) => {
    const created = await exams.createQuestion(props.examId, draft);
    mutate((current) => [...(current ?? []), created]);
    setAdding(false);
  });

  const save = createAction(async (qid: string, draft: QuestionDraft) => {
    const updated = await exams.updateQuestion(props.examId, qid, draft);
    mutate((current) => current?.map((q) => (q.id === qid ? updated : q)));
    setEditing(null);
  });

  const remove = createAction(async (qid: string) => {
    await exams.removeQuestion(props.examId, qid);
    mutate((current) => current?.filter((q) => q.id !== qid));
  });

  const totalPoints = () => (list() ?? []).reduce((sum, q) => sum + q.points, 0);

  return (
    <article class="stack gap-top">
      <div class="section-head">
        <h2>{t("questionsTitle")}</h2>
        <Show when={list()?.length}>
          <span class="badge">{t("totalPoints")(totalPoints())}</span>
        </Show>
        <button class="ghost" onClick={() => setAdding((open) => !open)}>
          <IconPlus /> {t("addQuestion")}
        </button>
      </div>

      <Show when={adding()}>
        <QuestionForm
          pending={create.pending()}
          onCancel={() => setAdding(false)}
          onSubmit={(draft) => void create.run(draft)}
        />
        <ErrorLine error={create.error()} />
      </Show>

      <ErrorLine error={save.error() ?? remove.error()} />

      <Show when={!list.loading} fallback={<Loading />}>
        <Show
          when={list()?.length}
          fallback={
            <Empty
              action={
                <button onClick={() => setAdding(true)}>
                  <IconPlus /> {t("addQuestion")}
                </button>
              }
            >
              {t("noQuestionsYet")}
            </Empty>
          }
        >
          <div class="stack">
            <For each={list()}>
              {(question, index) => (
                <div class="card stack">
                  <Show
                    when={editing() !== question.id}
                    fallback={
                      <QuestionForm
                        initial={question}
                        pending={save.pending()}
                        onCancel={() => setEditing(null)}
                        onSubmit={(draft) => void save.run(question.id, draft)}
                      />
                    }
                  >
                    <header class="row">
                      <strong>Q{index() + 1}</strong>
                      <span class="badge">{t("pts")(question.points)}</span>
                      <span class="badge">{t("questionKindWord")(question.kind)}</span>
                      <span class="row-actions push">
                        <button class="ghost" onClick={() => setEditing(question.id)}>
                          {t("edit")}
                        </button>
                        <ConfirmButton
                          disabled={remove.pending()}
                          onConfirm={() => void remove.run(question.id)}
                        >
                          {t("deleteNote")}
                        </ConfirmButton>
                      </span>
                    </header>
                    <p class="prewrap">{question.text}</p>
                    <Show when={question.choices}>
                      <ol class="choices">
                        <For each={question.choices}>
                          {(choice, choiceIndex) => (
                            <li classList={{ correct: choiceIndex() === question.correct }}>
                              {choice}
                              <Show when={choiceIndex() === question.correct}> ✓</Show>
                            </li>
                          )}
                        </For>
                      </ol>
                    </Show>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </article>
  );
}

/** Create/edit form; choice options are dynamic rows with a "right answer" radio. */
function QuestionForm(props: {
  initial?: ExamQuestion;
  pending: boolean;
  onSubmit: (draft: QuestionDraft) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = createSignal<QuestionKind>(props.initial?.kind ?? "choice");
  const [options, setOptions] = createSignal<string[]>(
    props.initial?.choices ?? ["", ""],
  );
  const [correct, setCorrect] = createSignal(props.initial?.correct ?? 0);

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index));
    if (correct() === index) setCorrect(0);
    else if (correct() > index) setCorrect(correct() - 1);
  };

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form);
    props.onSubmit({
      text: String(data.get("text")),
      kind: kind(),
      points: Number(data.get("points")),
      choices: kind() === "choice" ? options() : null,
      correct: kind() === "choice" ? correct() : null,
    });
  };

  return (
    <form
      class="stack"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <label>
        {t("questionLabel")}
        <textarea
          name="text"
          rows={2}
          required
          maxLength={LIMITS.questionText}
          ref={(el) => queueMicrotask(() => el.focus())}
        >
          {props.initial?.text ?? ""}
        </textarea>
      </label>
      <div class="row">
        <label>
          {t("answerType")}
          <select
            value={kind()}
            onChange={(e) => setKind(e.currentTarget.value as QuestionKind)}
          >
            <option value="choice">{t("answerTypeChoice")}</option>
            <option value="text">{t("answerTypeText")}</option>
          </select>
        </label>
        <label>
          {t("points")}
          <input
            name="points"
            type="number"
            required
            min={LIMITS.questionPoints.min}
            max={LIMITS.questionPoints.max}
            value={props.initial?.points ?? 10}
          />
        </label>
      </div>

      <Show when={kind() === "choice"}>
        <div class="stack">
          <span class="hint">{t("tickRightAnswer")}</span>
          <For each={options()}>
            {(option, index) => (
              <div class="option-row">
                <input
                  type="radio"
                  name="correct-pick"
                  checked={correct() === index()}
                  onChange={() => setCorrect(index())}
                  aria-label={t("optionIsRight")(index() + 1)}
                />
                <input
                  value={option}
                  required
                  maxLength={LIMITS.choiceText}
                  placeholder={t("optionN")(index() + 1)}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setOptions((current) =>
                      current.map((v, i) => (i === index() ? value : v)),
                    );
                  }}
                />
                <button
                  type="button"
                  class="ghost icon-btn"
                  aria-label={t("removeOption")}
                  disabled={options().length <= LIMITS.questionChoices.min}
                  onClick={() => removeOption(index())}
                >
                  ×
                </button>
              </div>
            )}
          </For>
          <span class="row-actions">
            <button
              type="button"
              class="ghost"
              disabled={options().length >= LIMITS.questionChoices.max}
              onClick={() => setOptions((current) => [...current, ""])}
            >
              <IconPlus /> {t("addOption")}
            </button>
          </span>
        </div>
      </Show>

      <span class="row-actions">
        <button type="submit" disabled={props.pending}>
          {t("saveQuestion")}
        </button>
        <button type="button" class="ghost" onClick={props.onCancel}>
          {t("cancel")}
        </button>
      </span>
    </form>
  );
}
