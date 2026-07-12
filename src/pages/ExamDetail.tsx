// One exam: view-first, with an edit toggle for whoever manages its course
// (creator or manager+), the caller's own mark, and — for teacher+ — grading,
// results, statistics.

import { A, useNavigate, useParams } from "@solidjs/router";
import {
  For,
  Match,
  Show,
  Switch,
  createResource,
  createSignal,
  onCleanup,
} from "solid-js";
import { ConfirmButton } from "../components/ConfirmButton";
import { ExamMonitor } from "../components/ExamMonitor";
import { ExamQuestions } from "../components/ExamQuestions";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit } from "../components/Icons";
import { ScheduleFields, scheduleFromForm } from "../components/ScheduleFields";
import { UserPicker } from "../components/UserPicker";
import { createAction } from "../lib/action";
import { ApiError, courses, exams } from "../lib/api";
import { useAuth } from "../lib/auth";
import { createClock } from "../lib/clock";
import { t } from "../lib/i18n";
import {
  formatCountdown,
  formatMillis,
  formatWindow,
  personLabel,
} from "../lib/format";
import { EXAM_KINDS, LIMITS, type Exam, type ExamResult } from "../lib/types";

export default function ExamDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [editing, setEditing] = createSignal(false);

  const [exam, { mutate: setExam }] = createResource(() => params.id, exams.get);
  // Management rights hang off the exam's course, not the exam row itself.
  const [course] = createResource(() => exam()?.course, courses.get);
  const canManage = () => {
    const parent = course();
    return parent !== undefined && (parent.creator === user()?.id || can("manager"));
  };

  const save = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setExam(
      await exams.update(params.id, {
        title: String(data.get("title")),
        description: String(data.get("description")),
        kind: String(data.get("kind")),
        weight: Number(data.get("weight")),
        ...scheduleFromForm(data),
      }),
    );
    setEditing(false);
  });

  const remove = createAction(async () => {
    await exams.remove(params.id);
    navigate("/exams", { replace: true });
  });

  return (
    <Show
      when={exam()}
      fallback={exam.error ? <NotFoundMessage error={exam.error} /> : <Loading />}
    >
      {(current) => (
        <section class="page">
          <header class="page-head">
            <div>
              <div class="row">
                <h1>{current().title}</h1>
                <span class="badge">{t("kindWord")(current().kind)}</span>
                <span class="badge" title={t("weightTitle")}>
                  {t("weightBadge")(current().weight)}
                </span>
              </div>
              <p class="sub">
                {t("coursePrefix")}{" "}
                <A href={`/courses/${current().course}`}>
                  {course()?.title ?? current().course}
                </A>
              </p>
            </div>
            <Show when={canManage()}>
              <button class="ghost" onClick={() => setEditing((open) => !open)}>
                <IconEdit /> {editing() ? t("close") : t("edit")}
              </button>
            </Show>
          </header>

          <Show when={!editing() && current().description}>
            <p class="prewrap">{current().description}</p>
          </Show>

          <Show when={editing()}>
            <form
              class="card stack"
              onSubmit={(e) => {
                e.preventDefault();
                void save.run(e.currentTarget);
              }}
            >
              <label>
                {t("title")}
                <input
                  name="title"
                  value={current().title}
                  required
                  maxLength={LIMITS.examTitle}
                />
              </label>
              <label>
                {t("description")}
                <textarea name="description" rows={3} maxLength={LIMITS.examDescription}>
                  {current().description}
                </textarea>
              </label>
              <div class="row">
                <label>
                  {t("kind")}
                  <select name="kind" value={current().kind}>
                    <For each={EXAM_KINDS}>
                      {(kind) => (
                        <option value={kind} selected={kind === current().kind}>
                          {t("kindWord")(kind)}
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <label>
                  {t("weight")}
                  <input
                    name="weight"
                    type="number"
                    value={current().weight}
                    required
                    min={LIMITS.weight.min}
                    max={LIMITS.weight.max}
                  />
                </label>
              </div>
              <ScheduleFields exam={current()} />
              <ErrorLine error={save.error() ?? remove.error()} />
              <span class="row-actions">
                <button type="submit" disabled={save.pending()}>
                  {t("save")}
                </button>
                <button type="button" class="ghost" onClick={() => setEditing(false)}>
                  {t("cancel")}
                </button>
                <ConfirmButton
                  class="ghost danger push"
                  confirmText={t("reallyDeleteExam")}
                  disabled={remove.pending()}
                  onConfirm={() => void remove.run()}
                >
                  {t("deleteExam")}
                </ConfirmButton>
              </span>
            </form>
          </Show>

          <Show when={current().mode}>
            <Sitting exam={current()} />
          </Show>
          <MyResult examId={params.id} />
          <Show when={canManage()}>
            <ExamQuestions examId={params.id} />
          </Show>
          <Show when={can("teacher")}>
            <Show when={current().mode}>
              <ExamMonitor exam={current()} />
            </Show>
            <Statistics examId={params.id} />
            <Results examId={params.id} />
          </Show>
        </section>
      )}
    </Show>
  );
}

/**
 * The student-facing "exam time" card of a scheduled exam: the window, whether
 * it is open right now (by the server clock), and the one action that makes
 * sense — enter, continue, or review what was written.
 */
function Sitting(props: { exam: Exam }) {
  const navigate = useNavigate();
  const clock = createClock();
  onCleanup(clock.stop);

  const [attempt] = createResource(
    () => props.exam.id,
    async (id) => {
      try {
        return await exams.myAttempt(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );

  const phase = () => {
    if (clock.now() < (props.exam.starts_at ?? 0)) return "upcoming" as const;
    if (clock.now() >= (props.exam.ends_at ?? 0)) return "closed" as const;
    return "open" as const;
  };

  // The live view of a running attempt: the server said in_progress, but the
  // deadline may have passed since — judge it against the ticking clock.
  const running = () => {
    const current = attempt();
    return current?.status === "in_progress" &&
      (current.deadline === null || clock.now() < current.deadline)
      ? current
      : undefined;
  };
  const ranOut = () => {
    const current = attempt();
    return (
      current?.status === "expired" ||
      (current?.status === "in_progress" && !running())
    );
  };

  const enter = createAction(async () => {
    // Idempotent on the backend: re-entering never resets the clock.
    await exams.startAttempt(props.exam.id);
    navigate(`/exams/${props.exam.id}/room`);
  });

  const minutes = () => Math.round((props.exam.duration_ms ?? 0) / 60_000);

  return (
    <article class="card stack sitting">
      <header class="row">
        <h2>{t("examTime")}</h2>
        <span class={`badge phase-${phase()}`}>{t("phaseWord")(phase())}</span>
      </header>
      <p class="meta">
        {formatWindow(props.exam.starts_at, props.exam.ends_at)}
        <Show when={props.exam.mode === "async"}> · {t("minutesEach")(minutes())}</Show>
      </p>

      <Show when={!attempt.loading}>
        <Switch>
          <Match when={attempt()?.status === "submitted"}>
            <p>{t("turnedInAt")(formatMillis(attempt()!.finished_at))}</p>
            <span class="row-actions">
              <button class="ghost" onClick={() => navigate(`/exams/${props.exam.id}/room`)}>
                {t("seeMyAnswers")}
              </button>
            </span>
          </Match>
          <Match when={ranOut()}>
            <p>{t("timeRanOut")}</p>
            <span class="row-actions">
              <button class="ghost" onClick={() => navigate(`/exams/${props.exam.id}/room`)}>
                {t("seeMyAnswers")}
              </button>
            </span>
          </Match>
          <Match when={running()}>
            {(current) => (
              <span class="row-actions">
                <button
                  class="cta"
                  onClick={() => navigate(`/exams/${props.exam.id}/room`)}
                >
                  {t("continueExam")}
                </button>
                <span class="meta">
                  {t("answeredOf")(current().answered, current().question_count)}
                  <Show when={current().deadline !== null}>
                    {" · "}
                    {t("timeLeftShort")(formatCountdown(current().deadline! - clock.now()))}
                  </Show>
                </span>
              </span>
            )}
          </Match>
          <Match when={attempt() === null && phase() === "open"}>
            <span class="row-actions">
              <Show
                when={props.exam.mode === "async"}
                fallback={
                  <button class="cta" disabled={enter.pending()} onClick={() => void enter.run()}>
                    {t("enterExam")}
                  </button>
                }
              >
                <ConfirmButton
                  class="cta"
                  confirmText={t("startTimerConfirm")(minutes())}
                  disabled={enter.pending()}
                  onConfirm={() => void enter.run()}
                >
                  {t("enterExam")}
                </ConfirmButton>
              </Show>
            </span>
          </Match>
          <Match when={attempt() === null && phase() === "upcoming"}>
            <p class="muted">{t("opensAt")(formatMillis(props.exam.starts_at))}</p>
          </Match>
          <Match when={attempt() === null && phase() === "closed"}>
            <p class="muted">{t("examOver")}</p>
          </Match>
        </Switch>
      </Show>
      <ErrorLine error={enter.error()} />
    </article>
  );
}

/** The caller's own mark; the backend answers 404 while ungraded. */
function MyResult(props: { examId: string }) {
  const [result] = createResource(
    () => props.examId,
    async (id) => {
      try {
        return await exams.myResult(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );

  return (
    <article class="stack gap-top">
      <h2>{t("myResult")}</h2>
      <Show when={!result.loading} fallback={<Loading />}>
        <Show when={result()} fallback={<Empty>{t("notGradedYet")}</Empty>}>
          {(mine) => (
            <p class="mark">
              {mine().mark}
              <small> / 100</small>
            </p>
          )}
        </Show>
      </Show>
    </article>
  );
}

/** Mark statistics over the graded results. Teacher+ only. */
function Statistics(props: { examId: string }) {
  const [stats] = createResource(() => props.examId, exams.statistics);
  const round = (value: number) => (Math.round(value * 100) / 100).toString();

  return (
    <article class="stack gap-top">
      <h2>{t("statistics")}</h2>
      <Show when={!stats.loading} fallback={<Loading />}>
        <Show when={stats()}>
          {(current) => (
            <Show when={current().graded > 0} fallback={<Empty>{t("nothingGradedYet")}</Empty>}>
              <div class="stats">
                <div class="card stat">
                  <span class="stat-label">{t("gradedStat")}</span>
                  <span class="stat-value">{current().graded}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">{t("averageStat")}</span>
                  <span class="stat-value">{round(current().average ?? 0)}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">{t("minStat")}</span>
                  <span class="stat-value">{current().min}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">{t("maxStat")}</span>
                  <span class="stat-value">{current().max}</span>
                </div>
              </div>
            </Show>
          )}
        </Show>
      </Show>
    </article>
  );
}

/** Full result table + grade form. Teacher+ only (the backend enforces course
 * management rights and target enrollment on write). */
function Results(props: { examId: string }) {
  const { user } = useAuth();
  const [results, { mutate }] = createResource(() => props.examId, exams.results);

  const grade = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const graded = await exams.grade(
      props.examId,
      String(data.get("user_id")),
      Number(data.get("mark")),
    );
    // One result per (exam, user); grading again overwrites.
    mutate((current) => [
      ...(current ?? []).filter((r) => r.user.id !== graded.user.id),
      graded,
    ]);
    form.reset();
  });

  const removeResult = createAction(async (result: ExamResult) => {
    await exams.removeResult(props.examId, result.user.id);
    mutate((current) => current?.filter((r) => r.user.id !== result.user.id));
  });

  return (
    <article class="stack gap-top">
      <h2>{t("results")}</h2>
      <form
        class="row row-end"
        onSubmit={(e) => {
          e.preventDefault();
          void grade.run(e.currentTarget);
        }}
      >
        <UserPicker name="user_id" label={t("student")} />
        <label>
          {t("mark0100")}
          <input
            name="mark"
            type="number"
            required
            min={LIMITS.mark.min}
            max={LIMITS.mark.max}
          />
        </label>
        <button type="submit" disabled={grade.pending()}>
          {t("gradeAction")}
        </button>
      </form>
      <ErrorLine error={grade.error() ?? removeResult.error()} />

      <Show when={!results.loading} fallback={<Loading />}>
        <Show when={results()?.length} fallback={<Empty>{t("noResultsYet")}</Empty>}>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("student")}</th>
                  <th>{t("markCol")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={results()}>
                  {(result) => (
                    <tr>
                      <td>
                        {personLabel(result.user)}
                        <Show when={result.user.id === user()?.id}>{t("you")}</Show>
                      </td>
                      <td>{result.mark}</td>
                      <td>
                        <ConfirmButton
                          confirmText={t("reallyRemove")}
                          disabled={removeResult.pending()}
                          onConfirm={() => void removeResult.run(result)}
                        >
                          {t("remove")}
                        </ConfirmButton>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </article>
  );
}

function NotFoundMessage(props: { error: unknown }) {
  const message = () =>
    props.error instanceof ApiError && props.error.status === 404
      ? t("examMissing")
      : t("examLoadFailed");
  return <Empty>{message()}</Empty>;
}
