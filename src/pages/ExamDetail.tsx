// One exam: view-first, with an edit toggle for whoever manages its course
// (creator or manager+), the caller's own mark, and — for teacher+ — grading,
// results, statistics.

import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit } from "../components/Icons";
import { createAction } from "../lib/action";
import { ApiError, courses, exams } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EXAM_KINDS, LIMITS, type ExamResult } from "../lib/types";

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
                <span class="badge">{current().kind}</span>
                <span class="badge" title="weight in the course average">
                  ×{current().weight}
                </span>
              </div>
              <p class="sub">
                Course:{" "}
                <A href={`/courses/${current().course}`}>
                  {course()?.title ?? current().course}
                </A>
              </p>
            </div>
            <Show when={canManage()}>
              <button class="ghost" onClick={() => setEditing((open) => !open)}>
                <IconEdit /> {editing() ? "Close" : "Edit"}
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
              <input
                name="title"
                value={current().title}
                required
                maxLength={LIMITS.examTitle}
              />
              <textarea name="description" rows={3} maxLength={LIMITS.examDescription}>
                {current().description}
              </textarea>
              <div class="row">
                <label>
                  Kind
                  <select name="kind" value={current().kind}>
                    <For each={EXAM_KINDS}>
                      {(kind) => (
                        <option value={kind} selected={kind === current().kind}>
                          {kind}
                        </option>
                      )}
                    </For>
                  </select>
                </label>
                <label>
                  Weight
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
              <ErrorLine error={save.error() ?? remove.error()} />
              <span class="row-actions">
                <button type="submit" disabled={save.pending()}>
                  Save
                </button>
                <button type="button" class="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  class="ghost danger push"
                  disabled={remove.pending()}
                  onClick={() => void remove.run()}
                >
                  Delete exam
                </button>
              </span>
            </form>
          </Show>

          <MyResult examId={params.id} />
          <Show when={can("teacher")}>
            <Statistics examId={params.id} />
            <Results examId={params.id} />
          </Show>
        </section>
      )}
    </Show>
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
      <h2>My result</h2>
      <Show when={!result.loading} fallback={<Loading />}>
        <Show when={result()} fallback={<Empty>Not graded yet.</Empty>}>
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
      <h2>Statistics</h2>
      <Show when={!stats.loading} fallback={<Loading />}>
        <Show when={stats()}>
          {(current) => (
            <Show when={current().graded > 0} fallback={<Empty>Nothing graded yet.</Empty>}>
              <div class="stats">
                <div class="card stat">
                  <span class="stat-label">Graded</span>
                  <span class="stat-value">{current().graded}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">Average</span>
                  <span class="stat-value">{round(current().average ?? 0)}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">Min</span>
                  <span class="stat-value">{current().min}</span>
                </div>
                <div class="card stat">
                  <span class="stat-label">Max</span>
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
      ...(current ?? []).filter((r) => r.user !== graded.user),
      graded,
    ]);
    form.reset();
  });

  const removeResult = createAction(async (result: ExamResult) => {
    await exams.removeResult(props.examId, result.user);
    mutate((current) => current?.filter((r) => r.user !== result.user));
  });

  return (
    <article class="stack gap-top">
      <h2>Results</h2>
      <form
        class="row"
        onSubmit={(e) => {
          e.preventDefault();
          void grade.run(e.currentTarget);
        }}
      >
        <input name="user_id" placeholder="Student id" required />
        <input
          name="mark"
          type="number"
          placeholder="Mark"
          required
          min={LIMITS.mark.min}
          max={LIMITS.mark.max}
        />
        <button type="submit" disabled={grade.pending()}>
          Grade
        </button>
      </form>
      <ErrorLine error={grade.error() ?? removeResult.error()} />

      <Show when={!results.loading} fallback={<Loading />}>
        <Show when={results()?.length} fallback={<Empty>No results yet.</Empty>}>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Mark</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={results()}>
                  {(result) => (
                    <tr>
                      <td class="mono">{result.user === user()?.id ? "you" : result.user}</td>
                      <td>{result.mark}</td>
                      <td>
                        <button
                          class="ghost danger"
                          disabled={removeResult.pending()}
                          onClick={() => void removeResult.run(result)}
                        >
                          Remove
                        </button>
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
  const message =
    props.error instanceof ApiError && props.error.status === 404
      ? "This exam does not exist."
      : "Failed to load the exam.";
  return <Empty>{message}</Empty>;
}
