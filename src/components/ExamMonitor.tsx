// The teacher's live view of a scheduled exam: who's in, who's still writing,
// time each student has left, marks as they land. Fed by the backend's SSE
// stream (a fresh snapshot every couple of seconds); the browser's
// EventSource reconnects by itself. Each row opens the student's answer
// sheet with the machine's auto-score suggestion and an inline grade box.

import { For, Show, createResource, createSignal, onCleanup } from "solid-js";
import { createAction } from "../lib/action";
import { exams } from "../lib/api";
import { formatCountdown, personLabel } from "../lib/format";
import { t } from "../lib/i18n";
import type { Exam, ExamLive, LiveStudent, PersonRef } from "../lib/types";
import { LIMITS } from "../lib/types";
import { Empty, ErrorLine, Loading } from "./Feedback";

export function ExamMonitor(props: { exam: Exam }) {
  const [snapshot, setSnapshot] = createSignal<ExamLive | null>(null);
  const [reviewing, setReviewing] = createSignal<PersonRef | null>(null);

  const source = new EventSource(exams.liveStreamUrl(props.exam.id), {
    withCredentials: true,
  });
  source.addEventListener("snapshot", (event) => {
    setSnapshot(JSON.parse((event as MessageEvent).data) as ExamLive);
  });
  onCleanup(() => source.close());

  const seconds = (student: LiveStudent) =>
    student.remaining_ms === null ? "—" : formatCountdown(student.remaining_ms);

  const activity = (student: LiveStudent, now: number) => {
    if (student.last_activity === null) return "—";
    const secondsAgo = Math.max(0, Math.round((now - student.last_activity) / 1000));
    return secondsAgo < 120
      ? t("agoSeconds")(secondsAgo)
      : t("agoMinutes")(Math.round(secondsAgo / 60));
  };

  return (
    <article class="stack gap-top">
      <h2>{t("liveMonitor")}</h2>
      <Show when={snapshot()} fallback={<Loading />}>
        {(live) => (
          <>
            <div class="live-counts">
              <span class="badge">{t("countEnrolled")(live().counts.enrolled)}</span>
              <span class="badge phase-open">{t("countWriting")(live().counts.in_progress)}</span>
              <span class="badge">{t("countTurnedIn")(live().counts.submitted)}</span>
              <span class="badge">{t("countNotStarted")(live().counts.not_started)}</span>
              <Show when={live().counts.expired > 0}>
                <span class="badge phase-closed">{t("countTimeUp")(live().counts.expired)}</span>
              </Show>
              <span class="badge">{t("countGraded")(live().counts.graded)}</span>
            </div>

            <Show
              when={live().students.length}
              fallback={<Empty>{t("nobodyEnrolledCourse")}</Empty>}
            >
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("student")}</th>
                      <th>{t("status")}</th>
                      <th>{t("answeredCol")}</th>
                      <th>{t("timeLeftCol")}</th>
                      <th>{t("lastSaveCol")}</th>
                      <th>{t("markCol")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    <For each={live().students}>
                      {(student) => (
                        <tr>
                          <td>{personLabel(student.user)}</td>
                          <td>
                            <span class={`badge status-${student.status}`}>
                              {t("liveStatusWord")(student.status)}
                            </span>
                          </td>
                          <td>
                            {student.answered} / {live().question_count}
                          </td>
                          <td>{seconds(student)}</td>
                          <td class="meta">{activity(student, live().now)}</td>
                          <td>{student.mark ?? "—"}</td>
                          <td>
                            <Show when={student.status !== "not_started"}>
                              <button
                                class="ghost"
                                onClick={() =>
                                  setReviewing((current) =>
                                    current?.id === student.user.id ? null : student.user,
                                  )
                                }
                              >
                                {reviewing()?.id === student.user.id ? t("close") : t("review")}
                              </button>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>

            <Show when={reviewing()}>
              {(student) => <AnswerSheet examId={props.exam.id} student={student()} />}
            </Show>
          </>
        )}
      </Show>
    </article>
  );
}

/** One student's judged answers plus the auto-score suggestion and a grade box. */
function AnswerSheet(props: { examId: string; student: PersonRef }) {
  const [sheet] = createResource(
    () => [props.examId, props.student.id] as const,
    ([examId, userId]) => exams.attemptAnswers(examId, userId),
  );
  // The authored questions (with text/choices/correct) to render rows against.
  const [questions] = createResource(() => props.examId, exams.questions);

  const grade = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    await exams.grade(props.examId, props.student.id, Number(data.get("mark")));
  });

  const suggestion = () => {
    const auto = sheet()?.auto_score;
    return auto && auto.possible > 0
      ? Math.round((auto.earned / auto.possible) * 100)
      : undefined;
  };

  return (
    <div class="card stack">
      <h3>{t("sheetTitle")(personLabel(props.student))}</h3>
      <Show when={sheet() && questions()} fallback={<Loading />}>
        <Show
          when={questions()!.length}
          fallback={<Empty>{t("noQuestionsSheet")}</Empty>}
        >
          <div class="stack">
            <For each={questions()}>
              {(question, index) => {
                const answer = () =>
                  sheet()!.answers.find((a) => a.question === question.id);
                return (
                  <div class="sheet-row">
                    <p class="qtext">
                      <strong>Q{index() + 1}.</strong> {question.text}
                      <span class="badge">{t("pts")(question.points)}</span>
                    </p>
                    <Show when={answer()} fallback={<p class="muted">{t("noAnswer")}</p>}>
                      {(current) => (
                        <p
                          classList={{
                            "answer-ok": current().is_correct === true,
                            "answer-bad": current().is_correct === false,
                          }}
                        >
                          <Show
                            when={question.kind === "choice"}
                            fallback={<span class="prewrap">{current().text || "—"}</span>}
                          >
                            {question.choices?.[current().selected ?? -1] ?? "—"}
                            <Show when={current().is_correct === true}> ✓</Show>
                            <Show when={current().is_correct === false}>
                              {t("rightAnswerIs")(question.choices?.[question.correct ?? -1] ?? "—")}
                            </Show>
                          </Show>
                        </p>
                      )}
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          <p class="meta">
            {t("autoScoreLine")(sheet()!.auto_score.earned, sheet()!.auto_score.possible)}
          </p>
        </Show>

        <form
          class="row row-end"
          onSubmit={(e) => {
            e.preventDefault();
            void grade.run(e.currentTarget);
          }}
        >
          <label>
            {t("mark0100")}
            <input
              name="mark"
              type="number"
              required
              min={LIMITS.mark.min}
              max={LIMITS.mark.max}
              value={suggestion()}
            />
          </label>
          <button type="submit" disabled={grade.pending()}>
            {t("gradeAction")}
          </button>
        </form>
        <ErrorLine error={grade.error()} />
      </Show>
    </div>
  );
}
