// Weighted mark report: every enrolled course with its graded exams, the
// course averages, and the overall average. Teacher+ can look up any student.

import { A } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { Empty, ErrorLine, Loading } from "../components/Feedback";
import { UserPicker } from "../components/UserPicker";
import { createAction } from "../lib/action";
import { marks } from "../lib/api";
import { useAuth } from "../lib/auth";
import { personLabel } from "../lib/format";
import { t } from "../lib/i18n";
import type { MarksReport, PersonRef } from "../lib/types";

const round = (value: number) => (Math.round(value * 100) / 100).toString();

export default function Marks() {
  const { can } = useAuth();
  const [mine] = createResource(marks.mine);

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{t("marksTitle")}</h1>
          <p class="sub">{t("marksSub")}</p>
        </div>
      </header>

      <Show when={!mine.loading} fallback={<Loading />}>
        <Show when={mine()} fallback={<Empty>{t("marksLoadFailed")}</Empty>}>
          {(report) => <Report report={report()} />}
        </Show>
      </Show>

      <Show when={can("teacher")}>
        <Lookup />
      </Show>
    </section>
  );
}

/** Teacher+ tool: look up any student's report. */
function Lookup() {
  const [report, setReport] = createSignal<MarksReport | null>(null);
  const [who, setWho] = createSignal<PersonRef | null>(null);

  const fetch = createAction(async (form: HTMLFormElement) => {
    const data = new FormData(form);
    setReport(await marks.forUser(String(data.get("user_id"))));
  });

  return (
    <article class="card stack gap-top">
      <h2>{t("studentLookup")}</h2>
      <form
        class="row row-end"
        onSubmit={(e) => {
          e.preventDefault();
          void fetch.run(e.currentTarget);
        }}
      >
        <UserPicker name="user_id" label={t("student")} onPick={setWho} />
        <button type="submit" disabled={fetch.pending()}>
          {t("showMarks")}
        </button>
      </form>
      <ErrorLine error={fetch.error()} />

      <Show when={report()}>
        {(current) => (
          <>
            <Show when={who()}>
              {(person) => <p class="meta">{t("reportFor")(personLabel(person()))}</p>}
            </Show>
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
      fallback={<Empty>{t("notEnrolledAny")}</Empty>}
    >
      <div class="stack">
        <div class="card row" title={t("overallAverageTitle")}>
          <span class="muted">{t("overallAverage")}</span>
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
                <span class="badge" title={t("courseAverageTitle")}>
                  {block.average === null ? "—" : round(block.average)}
                </span>
              </header>
              <Show
                when={block.results.length}
                fallback={<Empty>{t("nothingGradedYet")}</Empty>}
              >
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("examCol")}</th>
                        <th>{t("kind")}</th>
                        <th>{t("weight")}</th>
                        <th>{t("markCol")}</th>
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
                              <span class="badge">{t("kindWord")(entry.kind)}</span>
                            </td>
                            <td>{t("weightBadge")(entry.weight)}</td>
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
