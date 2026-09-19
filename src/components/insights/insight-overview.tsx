import { Show } from "solid-js";
import { runReportDecimal, runReportPercent } from "@/lib/insight-run-report";
import type { InsightOverview as Overview } from "@/lib/insight-students";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/stores/preferences-context";

/**
 * The picture over the students read so far: how many have an analysis, how
 * many need attention, and the mean mark and attendance their summaries
 * measured. A figure no summary measured reads "no data", never 0.
 */
export function InsightOverview(props: { overview: Overview }) {
  const prefs = usePreferences();
  const t = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const tile = (label: string, value: string, hint: string, tone?: "warn") => (
    <div class="rounded-xl border border-border-line bg-surface-base px-4 py-3">
      <p class="text-xs font-medium text-muted-foreground">{label}</p>
      <p class={cn("mt-1 text-2xl font-semibold tabular-nums text-text-strong", tone === "warn" && "text-warning-text")}>{value}</p>
      <p class="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
  const o = () => props.overview;
  return (
    <section class="space-y-2" aria-label={t("insights.summary")}>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tile(t("insights.overview.analysed"), String(o().analysed), t("insights.overview.ofTotal", { total: o().total }))}
        {tile(
          t("insights.overview.needAttention"),
          String(o().needAttention),
          t("insights.overview.ofTotal", { total: o().total }),
          o().needAttention > 0 ? "warn" : undefined,
        )}
        {tile(
          t("insights.overview.marks"),
          o().marksAverage == null ? "—" : runReportDecimal(o().marksAverage!, prefs.locale()),
          o().marksAverage == null ? t("insights.overview.noData") : t("insights.overview.ofTotal", { total: o().analysed }),
        )}
        {tile(
          t("insights.overview.attendance"),
          o().attendanceRate == null ? "—" : runReportPercent(o().attendanceRate, prefs.locale()),
          o().attendanceRate == null ? t("insights.overview.noData") : t("insights.overview.ofTotal", { total: o().analysed }),
        )}
      </div>
      <Show when={o().loaded < o().total}>
        <p class="text-xs text-muted-foreground" role="status">
          {t("insights.overview.reading", { loaded: o().loaded, total: o().total })}
        </p>
      </Show>
    </section>
  );
}
