// Weighted mark report: every enrolled course with its graded exams, the
// course averages, and the overall average. Teacher+ can look up any student.

import { A } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { createAction } from "../lib/action";
import { marks } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { MarksReport } from "../lib/types";

const round = (value: number) => (Math.round(value * 100) / 100).toString();

export default function Marks() {
  const { can } = useAuth();
  const [mine] = createResource(marks.mine);

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>My marks</h1>
          <p class="sub">Graded exams per course, weighted averages included.</p>
        </div>
      </header>

      <Show when={!mine.loading} fallback={<Loading />}>
        <Show when={mine()} fallback={<Empty>Failed to load your marks.</Empty>}>
          {(report) => <Report report={report()} />}
        </Show>
      </Show>

      <Show when={can("teacher")}>
        <Lookup />
      </Show>
    </section>
  );
}

/** Teacher+ tool: fetch any student's report by id. */
function Lookup() {
  const [report, setReport] = createSignal<MarksReport | null>(null);

  const fetch = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setReport(await marks.forUser(String(data.get("user_id"))));
  });

  return (
    <article class="card stack gap-top">
      <h2>Student lookup</h2>
      <form
        class="row"
        onSubmit={(e) => {
          e.preventDefault();
          void fetch.run(e.currentTarget);
        }}
      >
        <input name="user_id" placeholder="Student id" required />
        <button type="submit" disabled={fetch.pending()}>
          Show marks
        </button>
      </form>
      <ErrorLine error={fetch.error()} />

      <Show when={report()}>
        {(current) => (
          <>
            <p class="meta">
              Report for <span class="mono">{current().user}</span>
            </p>
            <Report report={current()} />
          </>
        )}
      </Show>
    </article>
  );
}

function Report(props: { report: MarksReport }) {
  return (
    <Show
      when={props.report.courses.length}
      fallback={<Empty>Not enrolled in any course.</Empty>}
    >
      <div class="stack">
        <div class="card row" title="mean of the course averages">
          <span class="muted">Overall average</span>
          <p class="mark push">
            {props.report.overall_average === null ? (
              "—"
            ) : (
              <>
                {round(props.report.overall_average)}
                <small> / 100</small>
              </>
            )}
          </p>
        </div>

        <For each={props.report.courses}>
          {(block) => (
            <div class="card stack">
              <header class="row">
                <h3>
                  <A href={`/courses/${block.course.id}`}>{block.course.title}</A>
                </h3>
                <span class="badge" title="weighted course average">
                  {block.average === null ? "—" : round(block.average)}
                </span>
              </header>
              <Show
                when={block.results.length}
                fallback={<Empty>Nothing graded yet.</Empty>}
              >
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Kind</th>
                        <th>Weight</th>
                        <th>Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={block.results}>
                        {(entry) => (
                          <tr>
                            <td>
                              <A href={`/exams/${entry.exam}`}>{entry.title}</A>
                            </td>
                            <td>
                              <span class="badge">{entry.kind}</span>
                            </td>
                            <td>×{entry.weight}</td>
                            <td>{entry.mark}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
