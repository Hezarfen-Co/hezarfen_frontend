import { For, Show } from "solid-js";
import type { StudentInsight } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { InsightModuleView } from "@/components/insights/insight-module-views";
import { EmptyInline } from "@/components/ui/empty-inline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isRecord, type UnknownRecord } from "@/lib/is-record";
import { usePreferences } from "@/stores/preferences-context";

type Rec = UnknownRecord;

const obj = (value: unknown): Rec => (isRecord(value) ? value : {});
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function ChartCard(props: { label: string; value: string; hint?: string }) {
  return (
    <div class="rounded-xl border border-border-line bg-surface-base px-4 py-3">
      <p class="text-xs text-muted-foreground">{props.label}</p>
      <p class="mono mt-1 text-xl font-semibold tabular-nums text-text-strong">{props.value}</p>
      <Show when={props.hint}>
        <p class="mt-1 text-[11px] text-muted-foreground">{props.hint}</p>
      </Show>
    </div>
  );
}

function BarChart(props: {
  items: Array<{ label: string; value: number | null; color?: string }>;
  format?: (value: number) => string;
}) {
  const max = () => Math.max(...props.items.map((item) => item.value ?? 0), 1);
  const format = (value: number) => props.format?.(value) ?? String(value);
  return (
    <div class="space-y-3">
      <For each={props.items}>
        {(item) => (
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-3 text-xs">
              <span class="truncate text-muted-foreground">{item.label}</span>
              <span class="mono shrink-0 font-semibold text-text-strong">
                {item.value == null ? "—" : format(item.value)}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-surface-fill">
              <div
                class={`h-full rounded-full ${item.color ?? "bg-primary"}`}
                style={{ width: `${item.value == null ? 0 : Math.max(3, (item.value / max()) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

function AttendanceChart(props: { value: unknown; t: (key: string) => string }) {
  const overall = () => obj(obj(props.value).overall);
  const count = (key: string) => num(overall()[key]) ?? 0;
  const rate = () => num(overall().rate);
  return (
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <ChartCard label={props.t("insights.analysis.rate")} value={rate() == null ? "—" : `%${Math.round(rate()! * 100)}`} />
        <ChartCard label={props.t("insights.analysis.present")} value={String(count("present"))} />
        <ChartCard label={props.t("insights.analysis.absent")} value={String(count("absent"))} />
      </div>
      <BarChart
        items={[
          { label: props.t("insights.analysis.present"), value: count("present"), color: "bg-success" },
          { label: props.t("insights.analysis.absent"), value: count("absent"), color: "bg-destructive" },
          { label: props.t("insights.analysis.late"), value: count("late"), color: "bg-warning" },
          { label: props.t("insights.analysis.excused"), value: count("excused"), color: "bg-info" },
        ]}
      />
    </div>
  );
}

function MarksChart(props: { value: unknown; t: (key: string) => string }) {
  const courses = () => Object.entries(obj(obj(props.value).courses));
  const items = () => courses().map(([id, raw]) => {
    const stat = obj(raw);
    return { label: String(stat.course_title ?? id).slice(0, 32), value: num(stat.average) };
  });
  const averages = () => items().map((item) => item.value).filter((value): value is number => value != null);
  const average = () => averages().length ? averages().reduce((sum, value) => sum + value, 0) / averages().length : null;
  return (
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <ChartCard label={props.t("insights.analysis.average")} value={average() == null ? "—" : average()!.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} />
        <ChartCard label={props.t("insights.analysis.courses")} value={String(items().length)} />
        <ChartCard label={props.t("insights.analysis.bestMark")} value={averages().length ? Math.max(...averages()).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : "—"} />
      </div>
      <Show when={items().length > 0} fallback={<EmptyInline title={props.t("insights.noSummary")} illustration="charts" />}>
        <BarChart items={items()} format={(value) => value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} />
      </Show>
    </div>
  );
}

function StudyChart(props: { value: unknown; t: (key: string) => string }) {
  const recent = () => obj(obj(props.value).recent_28d);
  const hours = () => {
    const milliseconds = num(recent().total_focus_ms);
    return milliseconds == null ? null : milliseconds / 3_600_000;
  };
  return (
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <ChartCard label={props.t("insights.analysis.focusHours")} value={hours() == null ? "—" : hours()!.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} />
        <ChartCard label={props.t("insights.analysis.activeDays")} value={String(num(recent().active_days) ?? "—")} />
        <ChartCard label={props.t("insights.analysis.regularity")} value={num(recent().regularity) == null ? "—" : `%${Math.round(num(recent().regularity)! * 100)}`} />
      </div>
      <BarChart
        items={[
          { label: props.t("insights.analysis.focusHours"), value: hours(), color: "bg-primary" },
          { label: props.t("insights.analysis.activeDays"), value: num(recent().active_days), color: "bg-info" },
          { label: props.t("insights.analysis.sessions"), value: num(recent().n_stints), color: "bg-success" },
        ]}
        format={(value) => value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
      />
    </div>
  );
}

function SubmissionChart(props: { value: unknown; t: (key: string) => string }) {
  const overall = () => obj(obj(props.value).overall);
  const count = (key: string) => num(overall()[key]) ?? 0;
  const total = () => count("n");
  const submittedRate = () => total() > 0 ? count("n_submitted") / total() : null;
  return (
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <ChartCard label={props.t("insights.analysis.submittedRate")} value={submittedRate() == null ? "—" : `%${Math.round(submittedRate()! * 100)}`} />
        <ChartCard label={props.t("insights.analysis.submitted")} value={String(count("n_submitted"))} />
        <ChartCard label={props.t("insights.analysis.missing")} value={String(count("n_missing"))} />
      </div>
      <BarChart
        items={[
          { label: props.t("insights.analysis.submitted"), value: count("n_submitted"), color: "bg-success" },
          { label: props.t("insights.analysis.late"), value: count("n_late"), color: "bg-warning" },
          { label: props.t("insights.analysis.missing"), value: count("n_missing"), color: "bg-destructive" },
        ]}
      />
    </div>
  );
}

function ModuleTab(props: {
  module: "attendance" | "marks" | "study" | "submission";
  value: unknown;
  courseTitle: (id: string) => string | null;
  t: (key: string) => string;
}) {
  const chart = () => {
    if (props.module === "attendance") return <AttendanceChart value={props.value} t={props.t} />;
    if (props.module === "marks") return <MarksChart value={props.value} t={props.t} />;
    if (props.module === "study") return <StudyChart value={props.value} t={props.t} />;
    return <SubmissionChart value={props.value} t={props.t} />;
  };
  return (
    <Show when={props.value != null} fallback={<EmptyInline title={props.t("insights.sectionNotComputed")} illustration="charts" />}>
      <div class="space-y-5">
        <section class="rounded-xl border border-border-line bg-surface-base p-4">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-text-strong">{props.t(`insights.modules.${props.module}`)}</h2>
            <span class="text-xs text-muted-foreground">{props.t("insights.analysis.visual")}</span>
          </div>
          {chart()}
        </section>
        <section class="rounded-xl border border-border-line bg-surface-base p-4">
          <InsightModuleView module={props.module} value={props.value} courseTitle={props.courseTitle} />
        </section>
      </div>
  </Show>
  );
}

export function InsightStudentAnalysisTabs(props: { insight: StudentInsight }) {
  const prefs = usePreferences();
  const t = (key: string) => prefs.t(key as never);
  const summary = () => props.insight.summary;
  const courseTitle = (id: string) => {
    const courses = obj(obj(summary()?.marks).courses);
    const course = obj(courses[id]);
    return typeof course.course_title === "string" ? course.course_title : null;
  };
  const moduleValue = (module: "attendance" | "marks" | "study" | "submission") => summary()?.[module] ?? null;

  return (
    <Tabs defaultValue="overview" class="space-y-4">
      <TabsList class="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">{t("insights.analysis.overview")}</TabsTrigger>
        <TabsTrigger value="attendance">{t("insights.modules.attendance")}</TabsTrigger>
        <TabsTrigger value="marks">{t("insights.modules.marks")}</TabsTrigger>
        <TabsTrigger value="study">{t("insights.modules.study")}</TabsTrigger>
        <TabsTrigger value="submission">{t("insights.modules.submission")}</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" class="mt-0 space-y-5">
        <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ChartCard label={t("insights.modules.attendance")} value={num(obj(obj(moduleValue("attendance")).overall).rate) == null ? "—" : `%${Math.round(num(obj(obj(moduleValue("attendance")).overall).rate)! * 100)}`} />
          <ChartCard label={t("insights.modules.marks")} value={(() => {
            const values = Object.values(obj(obj(moduleValue("marks")).courses)).map((raw) => num(obj(raw).average)).filter((value): value is number => value != null);
            return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : "—";
          })()} />
          <ChartCard label={t("insights.modules.study")} value={(() => {
            const milliseconds = num(obj(obj(moduleValue("study")).recent_28d).total_focus_ms);
            return milliseconds == null ? "—" : `${(milliseconds / 3_600_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sa`;
          })()} />
          <ChartCard label={t("insights.modules.submission")} value={(() => {
            const overall = obj(obj(moduleValue("submission")).overall);
            const total = num(overall.n) ?? 0;
            const submitted = num(overall.n_submitted) ?? 0;
            return total > 0 ? `%${Math.round((submitted / total) * 100)}` : "—";
          })()} />
        </section>
        <InsightDetail insight={props.insight} mode="cards" />
      </TabsContent>

      <TabsContent value="attendance" class="mt-0">
        <ModuleTab module="attendance" value={moduleValue("attendance")} courseTitle={courseTitle} t={t} />
      </TabsContent>
      <TabsContent value="marks" class="mt-0">
        <ModuleTab module="marks" value={moduleValue("marks")} courseTitle={courseTitle} t={t} />
      </TabsContent>
      <TabsContent value="study" class="mt-0">
        <ModuleTab module="study" value={moduleValue("study")} courseTitle={courseTitle} t={t} />
      </TabsContent>
      <TabsContent value="submission" class="mt-0">
        <ModuleTab module="submission" value={moduleValue("submission")} courseTitle={courseTitle} t={t} />
      </TabsContent>
    </Tabs>
  );
}
