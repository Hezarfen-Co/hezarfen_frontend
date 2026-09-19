import { For, Show, createMemo } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import type { Homework } from "@/api/client";
import { getHomeworkSubmissions } from "@/api/homework";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconChevronRight } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";
import { queueCandidates, queueRow, type QueueRow } from "@/lib/homework-queue";
import { usePreferences, useT } from "@/stores/preferences-context";

/**
 * TCH "what is waiting on me": for the teacher's own homework due around
 * now, how many students have not handed in and how many hand-ins still need
 * a grade — as sentences, each linking to that homework. Counts come from
 * each homework's roster (`/homework/{id}/submissions`), read for a capped
 * handful since there is no bulk endpoint; a failed read drops its row.
 */
export function HomeworkQueuePanel(props: { homework: Homework[]; teacherId: string; now: number }) {
  const t = useT();
  const { locale } = usePreferences();
  const candidates = createMemo(() => queueCandidates(props.homework, props.teacherId, props.now));
  const [rows] = createResource(
    () => candidates().map((item) => item.id).join(",") || null,
    async () => {
      const settled = await Promise.all(
        candidates().map(async (item) => {
          try {
            return queueRow(item, (await getHomeworkSubmissions(item.id)).items);
          } catch {
            return null;
          }
        }),
      );
      return settled.filter((row): row is QueueRow => row != null && row.missing + row.toGrade > 0);
    },
  );
  const toGrade = () => (rows() ?? []).reduce((sum, row) => sum + row.toGrade, 0);

  return (
    <section class="flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4" aria-labelledby="homework-queue-heading">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="homework-queue-heading" class="text-base font-semibold tracking-tight text-text-strong">{t("homeworkQueue.title")}</h2>
        <Show when={toGrade() > 0}>
          <span class="text-xs font-medium text-warning-text">{t("homeworkQueue.toGradeTotal", { count: toGrade() })}</span>
        </Show>
      </div>
      <Show
        when={(rows() ?? []).length > 0}
        fallback={<EmptyInline illustration="calendar-empty" title={t("homeworkQueue.empty")} />}
      >
        <ul class="divide-y divide-border-hairline">
          <For each={rows()}>
            {(row) => (
              <li>
                <Link
                  to="/homework/$id"
                  params={{ id: row.homework.id }}
                  class="flex items-center gap-3 py-2.5 outline-hidden hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-text-default">{row.homework.title}</span>
                    <span class="block text-xs text-muted-foreground">
                      {[
                        row.missing > 0 ? t("homeworkQueue.missing", { count: row.missing }) : null,
                        row.toGrade > 0 ? t("homeworkQueue.toGrade", { count: row.toGrade }) : null,
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span class="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(row.homework.due_at, locale())}</span>
                  <IconChevronRight class="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
