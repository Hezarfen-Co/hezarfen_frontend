// All exams across courses. Creation lives on the course page; cards link to
// the detail page where editing, grading, results, and statistics live.

import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { Empty, Loading } from "../components/Feedback";
import { exams } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Exams() {
  const { can } = useAuth();
  const [list] = createResource(exams.list);

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Exams</h1>
          <p class="sub">
            All exams across courses.
            <Show when={can("teacher")}>
              {" "}
              New ones are created inside a <A href="/courses">course</A>.
            </Show>
          </p>
        </div>
      </header>

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
    </section>
  );
}
