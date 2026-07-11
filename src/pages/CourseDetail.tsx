// One course: view-first, with an edit toggle for its creator (or manager+),
// the course's exams with in-course creation, and — for teacher+ — the
// enrollment roster.

import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit, IconPlus } from "../components/Icons";
import { createAction } from "../lib/action";
import { ApiError, courses } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EXAM_KINDS, LIMITS, type Enrollment } from "../lib/types";

export default function CourseDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [editing, setEditing] = createSignal(false);

  const [course, { mutate: setCourse }] = createResource(() => params.id, courses.get);
  const canManage = () => {
    const current = course();
    return current !== undefined && (current.creator === user()?.id || can("manager"));
  };

  const save = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setCourse(
      await courses.update(params.id, {
        title: String(data.get("title")),
        description: String(data.get("description")),
      }),
    );
    setEditing(false);
  });

  const remove = createAction(async () => {
    await courses.remove(params.id);
    navigate("/courses", { replace: true });
  });

  return (
    <Show
      when={course()}
      fallback={course.error ? <NotFoundMessage error={course.error} /> : <Loading />}
    >
      {(current) => (
        <section class="page">
          <header class="page-head">
            <div>
              <h1>{current().title}</h1>
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
                maxLength={LIMITS.courseTitle}
              />
              <textarea name="description" rows={3} maxLength={LIMITS.courseDescription}>
                {current().description}
              </textarea>
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
                  Delete course
                </button>
              </span>
            </form>
          </Show>

          <CourseExams courseId={params.id} canManage={canManage()} />
          <Show when={can("teacher")}>
            <Roster courseId={params.id} canManage={canManage()} />
          </Show>
        </section>
      )}
    </Show>
  );
}

/** The course's exams; creator (or manager+) adds new ones here. */
function CourseExams(props: { courseId: string; canManage: boolean }) {
  const [list, { mutate }] = createResource(() => props.courseId, courses.exams);
  const [creating, setCreating] = createSignal(false);

  const create = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const created = await courses.createExam(props.courseId, {
      title: String(data.get("title")),
      description: String(data.get("description")),
      kind: String(data.get("kind")),
      weight: Number(data.get("weight")),
    });
    mutate((current) => [created, ...(current ?? [])]);
    form.reset();
    setCreating(false);
  });

  return (
    <article class="stack gap-top">
      <div class="section-head">
        <h2>Exams</h2>
        <Show when={props.canManage}>
          <button class="ghost" onClick={() => setCreating((open) => !open)}>
            <IconPlus /> New exam
          </button>
        </Show>
      </div>

      <Show when={creating()}>
        <form
          class="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            void create.run(e.currentTarget);
          }}
        >
          <input
            name="title"
            placeholder="Title"
            required
            maxLength={LIMITS.examTitle}
            ref={(el) => queueMicrotask(() => el.focus())}
          />
          <textarea
            name="description"
            placeholder="Description"
            rows={2}
            maxLength={LIMITS.examDescription}
          />
          <div class="row">
            <label>
              Kind
              <select name="kind">
                <For each={EXAM_KINDS}>{(kind) => <option value={kind}>{kind}</option>}</For>
              </select>
            </label>
            <label>
              Weight
              <input
                name="weight"
                type="number"
                value="1"
                required
                min={LIMITS.weight.min}
                max={LIMITS.weight.max}
              />
            </label>
          </div>
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              Add exam
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show when={list()?.length} fallback={<Empty>No exams yet.</Empty>}>
          <div class="grid">
            <For each={list()}>
              {(exam) => (
                <A href={`/exams/${exam.id}`} class="card link-card stack">
                  <header class="row">
                    <h3>{exam.title}</h3>
                    <span class="badge">{exam.kind}</span>
                    <span class="badge" title="weight in the course average">
                      ×{exam.weight}
                    </span>
                  </header>
                  <Show when={exam.description}>
                    <p class="muted clamp">{exam.description}</p>
                  </Show>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </article>
  );
}

/** Enrollment roster. Teacher+ sees it; creator (or manager+) edits it. */
function Roster(props: { courseId: string; canManage: boolean }) {
  const { user } = useAuth();
  const [roster, { mutate }] = createResource(() => props.courseId, courses.roster);

  const enroll = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const enrolled = await courses.enroll(props.courseId, String(data.get("user_id")));
    // Enrolling is an idempotent upsert; one row per (course, user).
    mutate((current) => [
      ...(current ?? []).filter((e) => e.user !== enrolled.user),
      enrolled,
    ]);
    form.reset();
  });

  const unenroll = createAction(async (entry: Enrollment) => {
    await courses.unenroll(props.courseId, entry.user);
    mutate((current) => current?.filter((e) => e.user !== entry.user));
  });

  return (
    <article class="stack gap-top">
      <h2>Roster</h2>

      <Show when={props.canManage}>
        <form
          class="row"
          onSubmit={(e) => {
            e.preventDefault();
            void enroll.run(e.currentTarget);
          }}
        >
          <input name="user_id" placeholder="Student id" required />
          <button type="submit" disabled={enroll.pending()}>
            Enroll
          </button>
        </form>
        <ErrorLine error={enroll.error() ?? unenroll.error()} />
      </Show>

      <Show when={!roster.loading} fallback={<Loading />}>
        <Show when={roster()?.length} fallback={<Empty>Nobody enrolled yet.</Empty>}>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrolled by</th>
                  <Show when={props.canManage}>
                    <th />
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={roster()}>
                  {(entry) => (
                    <tr>
                      <td class="mono">{entry.user === user()?.id ? "you" : entry.user}</td>
                      <td class="mono">{entry.enrolled_by}</td>
                      <Show when={props.canManage}>
                        <td>
                          <button
                            class="ghost danger"
                            disabled={unenroll.pending()}
                            onClick={() => void unenroll.run(entry)}
                          >
                            Unenroll
                          </button>
                        </td>
                      </Show>
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
      ? "This course does not exist."
      : "Failed to load the course.";
  return <Empty>{message}</Empty>;
}
