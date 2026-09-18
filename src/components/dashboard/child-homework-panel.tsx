import { For, Show } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { formatApiError } from "@/api/client";
import { getHomeworkReport } from "@/api/homework";
import type { HomeworkReportEntry } from "@/api/client";
import { EmptyInline } from "@/components/ui/empty-inline";
import { summarizeChildHomework } from "@/lib/child-homework";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

/** Rows per list; the counts in the sentences above them stay exact. */
const LIST_CAP = 5;

/**
 * PAR "what needs attention": the selected child's homework report turned
 * into two plain sentences — how much is overdue, how much is due this week —
 * with the rows behind each. Read only, and only the report's own fields:
 * the parent route serves statuses and marks, never the submitted files.
 */
export function ChildHomeworkPanel(props: { childId: string; now: number; class?: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const [report] = createResource(
    () => props.childId,
    async (childId): Promise<{ items: HomeworkReportEntry[]; error: string }> => {
      try {
        return { items: (await getHomeworkReport(childId)).items, error: "" };
      } catch (err) {
        return { items: [], error: formatApiError(err) };
      }
    },
  );
  const summary = () => summarizeChildHomework(report()?.items ?? [], props.now);

  const renderList = (rows: HomeworkReportEntry[], tone: "late" | "soon") => (
    <ul class="divide-y divide-border-hairline">
      <For each={rows.slice(0, LIST_CAP)}>
        {(row) => (
          <li class="flex items-center gap-3 py-2">
            <span class={cn("h-2 w-2 shrink-0 rounded-full", tone === "late" ? "bg-destructive" : "bg-warning")} aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate text-sm text-text-default">{row.title}</span>
            <span class="mono shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(row.due_at, locale())}</span>
          </li>
        )}
      </For>
    </ul>
  );

  return (
    <section class={cn("flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4", props.class)} aria-labelledby="child-homework-heading">
      <h2 id="child-homework-heading" class="text-base font-semibold tracking-tight text-text-strong">{t("childHomework.title")}</h2>
      <Show when={report()?.error}>
        <p class="text-sm text-destructive-text">{report()!.error}</p>
      </Show>
      <Show when={!report()?.error}>
        <Show
          when={summary().missing.length + summary().dueSoon.length > 0}
          fallback={<EmptyInline illustration="calendar-empty" title={t("childHomework.allClear")} />}
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <p class={cn("text-sm font-medium", summary().missing.length > 0 ? "text-destructive-text" : "text-muted-foreground")}>
                {summary().missing.length > 0 ? t("childHomework.missing", { count: summary().missing.length }) : t("childHomework.noneMissing")}
              </p>
              {renderList(summary().missing, "late")}
            </div>
            <div class="space-y-1.5">
              <p class="text-sm font-medium text-text-default">
                {summary().dueSoon.length > 0 ? t("childHomework.dueSoon", { count: summary().dueSoon.length }) : t("childHomework.noneDueSoon")}
              </p>
              {renderList(summary().dueSoon, "soon")}
            </div>
          </div>
        </Show>
      </Show>
    </section>
  );
}
