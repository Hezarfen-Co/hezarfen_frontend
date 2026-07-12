// One course: view-first, with an edit toggle for its creator (or manager+),
// the course's exams with in-course creation, and — for teacher+ — the
// enrollment roster.

import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { ConfirmButton } from "../components/ConfirmButton";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconEdit, IconPlus } from "../components/Icons";
import { ScheduleFields, scheduleFromForm } from "../components/ScheduleFields";
import { UserPicker } from "../components/UserPicker";
import { createAction } from "../lib/action";
import { ApiError, courses } from "../lib/api";
import { useAuth } from "../lib/auth";
import { personLabel } from "../lib/format";
import { t } from "../lib/i18n";
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
                  maxLength={LIMITS.courseTitle}
                />
              </label>
              <label>
                {t("description")}
                <textarea name="description" rows={3} maxLength={LIMITS.courseDescription}>
                  {current().description}
                </textarea>
              </label>
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
                  confirmText={t("reallyDeleteCourse")}
                  disabled={remove.pending()}
                  onConfirm={() => void remove.run()}
                >
                  {t("deleteCourse")}
                </ConfirmButton>
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
      ...scheduleFromForm(data),
    });
    mutate((current) => [created, ...(current ?? [])]);
    form.reset();
    setCreating(false);
  });

  return (
    <article class="stack gap-top">
      <div class="section-head">
        <h2>{t("examsTitle")}</h2>
        <Show when={props.canManage}>
          <button class="ghost" onClick={() => setCreating((open) => !open)}>
            <IconPlus /> {t("newExam")}
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
          <label>
            {t("title")}
            <input
              name="title"
              required
              maxLength={LIMITS.examTitle}
              ref={(el) => queueMicrotask(() => el.focus())}
            />
          </label>
          <label>
            {t("description")}
            <textarea name="description" rows={2} maxLength={LIMITS.examDescription} />
          </label>
          <div class="row">
            <label>
              {t("kind")}
              <select name="kind">
                <For each={EXAM_KINDS}>
                  {(kind) => <option value={kind}>{t("kindWord")(kind)}</option>}
                </For>
              </select>
            </label>
            <label>
              {t("weight")}
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
          <ScheduleFields />
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              {t("addExam")}
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              {t("cancel")}
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show
          when={list()?.length}
          fallback={
            <Empty
              action={
                props.canManage ? (
                  <button onClick={() => setCreating(true)}>
                    <IconPlus /> {t("newExam")}
                  </button>
                ) : undefined
              }
            >
              {t("noExamsYet")}
            </Empty>
          }
        >
          <div class="grid">
            <For each={list()}>
              {(exam) => (
                <A href={`/exams/${exam.id}`} class="card link-card stack">
                  <header class="row">
                    <h3>{exam.title}</h3>
                    <span class="badge">{t("kindWord")(exam.kind)}</span>
                    <span class="badge" title={t("weightTitle")}>
                      {t("weightBadge")(exam.weight)}
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
      ...(current ?? []).filter((e) => e.user.id !== enrolled.user.id),
      enrolled,
    ]);
    form.reset();
  });

  const unenroll = createAction(async (entry: Enrollment) => {
    await courses.unenroll(props.courseId, entry.user.id);
    mutate((current) => current?.filter((e) => e.user.id !== entry.user.id));
  });

  return (
    <article class="stack gap-top">
      <h2>{t("roster")}</h2>

      <Show when={props.canManage}>
        <form
          class="row row-end"
          onSubmit={(e) => {
            e.preventDefault();
            void enroll.run(e.currentTarget);
          }}
        >
          <UserPicker name="user_id" label={t("student")} />
          <button type="submit" disabled={enroll.pending()}>
            {t("enroll")}
          </button>
        </form>
        <ErrorLine error={enroll.error() ?? unenroll.error()} />
      </Show>

      <Show when={!roster.loading} fallback={<Loading />}>
        <Show when={roster()?.length} fallback={<Empty>{t("nobodyEnrolledYet")}</Empty>}>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("student")}</th>
                  <th>{t("enrolledBy")}</th>
                  <Show when={props.canManage}>
                    <th />
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={roster()}>
                  {(entry) => (
                    <tr>
                      <td>
                        {personLabel(entry.user)}
                        <Show when={entry.user.id === user()?.id}>{t("you")}</Show>
                      </td>
                      <td class="meta">{personLabel(entry.enrolled_by)}</td>
                      <Show when={props.canManage}>
                        <td>
                          <ConfirmButton
                            confirmText={t("reallyRemove")}
                            disabled={unenroll.pending()}
                            onConfirm={() => void unenroll.run(entry)}
                          >
                            {t("unenroll")}
                          </ConfirmButton>
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
  const message = () =>
    props.error instanceof ApiError && props.error.status === 404
      ? t("courseMissing")
      : t("courseLoadFailed");
  return <Empty>{message()}</Empty>;
}
