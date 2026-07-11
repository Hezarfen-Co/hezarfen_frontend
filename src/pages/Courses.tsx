// Course list plus creation (teacher+). Cards link to the detail page where
// editing, the roster, and the course's exams live.

import { A } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { IconPlus } from "../components/Icons";
import { createAction } from "../lib/action";
import { courses } from "../lib/api";
import { useAuth } from "../lib/auth";
import { LIMITS } from "../lib/types";

export default function Courses() {
  const { can } = useAuth();
  const [list, { mutate }] = createResource(courses.list);
  const [mine] = createResource(courses.mine);
  const enrolled = () => new Set(mine()?.map((course) => course.id));
  const [creating, setCreating] = createSignal(false);

  const create = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    const created = await courses.create({
      title: String(data.get("title")),
      description: String(data.get("description")),
    });
    mutate((current) => [created, ...(current ?? [])]);
    form.reset();
    setCreating(false);
  });

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Courses</h1>
          <p class="sub">Everything on offer — your enrollments are tagged.</p>
        </div>
        <Show when={can("teacher")}>
          <button onClick={() => setCreating((open) => !open)}>
            <IconPlus /> New course
          </button>
        </Show>
      </header>

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
            maxLength={LIMITS.courseTitle}
            ref={(el) => queueMicrotask(() => el.focus())}
          />
          <textarea
            name="description"
            placeholder="Description"
            rows={2}
            maxLength={LIMITS.courseDescription}
          />
          <ErrorLine error={create.error()} />
          <span class="row-actions">
            <button type="submit" disabled={create.pending()}>
              Add course
            </button>
            <button type="button" class="ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </span>
        </form>
      </Show>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show when={list()?.length} fallback={<Empty>No courses yet.</Empty>}>
          <div class="grid">
            <For each={list()}>
              {(course) => (
                <A href={`/courses/${course.id}`} class="card link-card stack">
                  <header class="row">
                    <h3>{course.title}</h3>
                    <Show when={enrolled().has(course.id)}>
                      <span class="badge">enrolled</span>
                    </Show>
                  </header>
                  <Show when={course.description}>
                    <p class="muted clamp">{course.description}</p>
                  </Show>
                </A>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </section>
  );
}
