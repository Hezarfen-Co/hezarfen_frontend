// All exams across courses. Creation lives on the course page; cards link to
// the detail page where editing, grading, results, and statistics live.

import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { Empty, Loading } from "../components/Feedback";
import { exams } from "../lib/api";
import { useAuth } from "../lib/auth";
import { t } from "../lib/i18n";

export default function Exams() {
  const { can } = useAuth();
  const [list] = createResource(exams.list);

  return (
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{t("examsTitle")}</h1>
          <p class="sub">
            {t("examsSubAll")}
            <Show when={can("teacher")}>
              {" "}
              <A href="/courses">{t("examsSubCreate")}</A>
            </Show>
          </p>
        </div>
      </header>

      <Show when={!list.loading} fallback={<Loading />}>
        <Show when={list()?.length} fallback={<Empty>{t("noExamsYet")}</Empty>}>
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
    </section>
  );
}
