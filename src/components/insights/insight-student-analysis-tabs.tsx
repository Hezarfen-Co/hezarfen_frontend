import { For, Show } from "solid-js";
import type { StudentInsight } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { InsightModuleView } from "@/components/insights/insight-module-views";
import { ChartBar, type ChartBarItem } from "@/components/ui/chart-bar";
import { ChartProgressRing, type ProgressRingSegment } from "@/components/ui/chart-progress-ring";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconAlert, IconChevronDown } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isRecord, type UnknownRecord } from "@/lib/is-record";
import { usePreferences } from "@/stores/preferences-context";

type Rec = UnknownRecord;

const obj = (value: unknown): Rec => (isRecord(value) ? value : {});
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function AttendanceChart(props: { value: unknown; t: (key: string) => string }) {
  const overall = () => obj(obj(props.value).overall);
  const count = (key: string) => num(overall()[key]) ?? 0;
  const rate = () => num(overall().rate);
  const segments = (): ProgressRingSegment[] => [
    { id: "present", label: props.t("insights.analysis.present"), value: count("present"), colorClass: "bg-success" },
    { id: "absent", label: props.t("insights.analysis.absent"), value: count("absent"), colorClass: "bg-destructive" },
    { id: "late", label: props.t("insights.analysis.late"), value: count("late"), colorClass: "bg-warning" },
    { id: "excused", label: props.t("insights.analysis.excused"), value: count("excused"), colorClass: "bg-info" },
  ];
  return (
    <ChartProgressRing
      title={props.t("insights.modules.attendance")}
      subtitle={props.t("insights.analysis.currentSnapshot")}
      valueText={rate() == null ? "—" : `%${Math.round(rate()! * 100)}`}
      subtext={props.t("insights.analysis.rate")}
      segments={segments()}
    />
  );
}

function MarksChart(props: { value: unknown; t: (key: string) => string }) {
  const courses = () => Object.entries(obj(obj(props.value).courses));
  const items = (): ChartBarItem[] => courses().flatMap(([id, raw]) => {
    const stat = obj(raw);
    const value = num(stat.average);
    return value == null ? [] : [{
      id,
      label: String(stat.course_title ?? id).slice(0, 32),
      value,
      max: 100,
      formattedValue: value.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
    }];
  });
  return (
    <ChartBar
      title={props.t("insights.modules.marks")}
      subtitle={props.t("insights.analysis.courseComparison")}
      items={items()}
      maxScale={100}
      itemsPerPage={8}
    />
  );
}

function StudyChart(props: { value: unknown; t: (key: string) => string }) {
  const recent = () => obj(obj(props.value).recent_28d);
  const hours = () => {
    const milliseconds = num(recent().total_focus_ms);
    return milliseconds == null ? null : milliseconds / 3_600_000;
  };
  const previous = () => obj(obj(props.value).previous_28d);
  const focusItems = (): ChartBarItem[] => {
    const currentHours = hours();
    const previousMs = num(previous().total_focus_ms);
    const previousHours = previousMs == null ? null : previousMs / 3_600_000;
    const items: ChartBarItem[] = [];
    if (currentHours != null) {
      items.push({
        id: "current",
        label: props.t("insights.analysis.currentPeriod"),
        value: currentHours,
        formattedValue: currentHours.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
        colorClass: "bg-primary",
      });
    }
    if (previousHours != null) {
      items.push({
        id: "previous",
        label: props.t("insights.analysis.previousPeriod"),
        value: previousHours,
        formattedValue: previousHours.toLocaleString("tr-TR", { maximumFractionDigits: 1 }),
        colorClass: "bg-info",
      });
    }
    return items;
  };
  return (
    <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <ChartBar
        title={props.t("insights.analysis.focusHours")}
        subtitle={props.t("insights.analysis.periodComparison")}
        items={focusItems()}
      />
      <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border-line bg-border-line lg:grid-cols-1">
        <div class="bg-surface-base p-4">
          <dt class="text-xs text-muted-foreground">{props.t("insights.analysis.activeDays")}</dt>
          <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-strong">{String(num(recent().active_days) ?? "—")}</dd>
        </div>
        <div class="bg-surface-base p-4">
          <dt class="text-xs text-muted-foreground">{props.t("insights.analysis.sessions")}</dt>
          <dd class="mt-1 text-2xl font-semibold tabular-nums text-text-strong">{String(num(recent().n_stints) ?? "—")}</dd>
        </div>
      </dl>
    </div>
  );
}

function SubmissionChart(props: { value: unknown; t: (key: string) => string }) {
  const overall = () => obj(obj(props.value).overall);
  const count = (key: string) => num(overall()[key]) ?? 0;
  const total = () => count("n");
  const submittedRate = () => total() > 0 ? count("n_submitted") / total() : null;
  const onTime = () => Math.max(0, count("n_submitted") - count("n_late"));
  const segments = (): ProgressRingSegment[] => [
    { id: "on-time", label: props.t("insights.analysis.onTime"), value: onTime(), colorClass: "bg-success" },
    { id: "late", label: props.t("insights.analysis.late"), value: count("n_late"), colorClass: "bg-warning" },
    { id: "missing", label: props.t("insights.analysis.missing"), value: count("n_missing"), colorClass: "bg-destructive" },
  ];
  return (
    <ChartProgressRing
      title={props.t("insights.modules.submission")}
      subtitle={props.t("insights.analysis.currentSnapshot")}
      valueText={submittedRate() == null ? "—" : `%${Math.round(submittedRate()! * 100)}`}
      subtext={props.t("insights.analysis.submittedRate")}
      segments={segments()}
      total={total()}
    />
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
      <div class="space-y-3">
        {chart()}
        {/* The evidence behind the chart above. A native disclosure — keyboard
            operable and state-exposing for free — kept deliberately quiet: the
            numbers inside are the subject, so the frame does not compete with
            them. The chevron leads, which is where a reader looks for one. */}
        <details class="group rounded-xl border border-border-line bg-surface-base">
          <summary class="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface-overlay/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <IconChevronDown class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-text-strong">{props.t("insights.analysis.details")}</span>
              <span class="mt-0.5 block text-xs leading-5 text-muted-foreground">{props.t("insights.analysis.detailsHint")}</span>
            </span>
          </summary>
          <div class="border-t border-border-hairline px-4 py-4">
            <InsightModuleView module={props.module} value={props.value} courseTitle={props.courseTitle} />
          </div>
        </details>
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

      <TabsContent value="overview" class="mt-0">
        <div class="grid gap-3 lg:grid-cols-2">
          <section class="space-y-3 rounded-xl border border-border-line bg-surface-base p-4">
            <div class="flex items-center gap-2">
              <IconAlert class="h-4 w-4 text-warning-text" />
              <h2 class="text-sm font-semibold text-text-strong">{t("insights.attention")}</h2>
            </div>
            <Show
              when={props.insight.attention.length > 0}
              fallback={<EmptyInline title={t("insights.noAttention")} illustration="empty" />}
            >
              <div class="space-y-2">
                <For each={props.insight.attention}>
                  {(item) => <article class="rounded-lg border border-warning/25 bg-warning/5 p-3 text-sm text-text-strong">{item.fact}</article>}
                </For>
              </div>
            </Show>
          </section>
          <div class="rounded-xl border border-border-line bg-surface-base p-4">
            <InsightDetail insight={props.insight} mode="cards" />
          </div>
        </div>
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
