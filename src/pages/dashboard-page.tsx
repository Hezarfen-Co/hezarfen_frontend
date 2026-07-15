import { For, Show, Suspense, createMemo, createResource, type JSX } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { formatApiError } from "@/api/client";
import { getCourses } from "@/api/getCourses";
import { getEvents } from "@/api/getEvents";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { getMyMarks } from "@/api/getMyMarks";
import { getNotes } from "@/api/getNotes";
import type { Role } from "@/api/types";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  IconBook,
  IconCalendar,
  IconChart,
  IconClipboardCheck,
  IconExam,
  IconNote,
  IconReportAnalytics,
  IconSchool,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { Locale, MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const PREVIEW_LIMIT = 5;

interface PortalCard {
  icon: JSX.Element;
  titleKey: MessageKey;
  to: string;
  descKey: MessageKey;
  stat: string | number;
  statSuffix?: MessageKey;
  accent: string;
  minRole?: Role;
}

interface TimelineItem {
  id: string;
  type: "event" | "exam";
  title: string;
  at: number | null;
  subtitle: string;
}

const ROLE_KEY: Record<Role, MessageKey> = {
  student: "role.student",
  teacher: "role.teacher",
  manager: "role.manager",
  admin: "role.admin",
};

const ROLE_BADGE_TONE: Record<Role, string> = {
  student: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  teacher: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  manager: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  admin: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

const CHART_TONES = ["bg-violet-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500", "bg-rose-500"];

const roundAvg = (n: number) => (Math.round(n * 10) / 10).toString();

export default function DashboardPage() {
  return (
    <RouteGuard>
      <DashboardContent />
    </RouteGuard>
  );
}

function DashboardContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const user = () => auth.user()!;
  const role = () => user().role;

  const [courses] = createResource(() => getCourses());
  const [myCourses] = createResource(async () => getMyCourses().catch(() => []));
  const [events] = createResource(() => getEvents());
  const [exams] = createResource(() => getExams());
  const [notes] = createResource(() => getNotes());
  const [marks] = createResource(
    () => (role() === "student" ? true : null),
    async (enabled) => (enabled ? getMyMarks() : null),
  );

  const resourceError = createMemo(() => {
    const e = courses.error || myCourses.error || events.error || exams.error || notes.error || marks.error;
    return e ? formatApiError(e, locale()) : null;
  });

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;

  const now = () => Date.now();

  const eventItems = () => (events() ?? []).map((event) => ({
    id: event.id,
    type: "event" as const,
    title: event.title,
    at: event.starts_at,
    subtitle: event.description || t("nav.events"),
  }));

  const courseMap = createMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses() ?? []) map.set(course.id, course.title);
    for (const course of myCourses() ?? []) map.set(course.id, course.title);
    return map;
  });

  const hasGlobalDashboardScope = createMemo(() => hasMinRole(role(), "admin"));
  const scopedCourses = createMemo(() => (hasGlobalDashboardScope() ? courses() ?? [] : myCourses() ?? []));
  const scopedCourseIds = createMemo(() => new Set(scopedCourses().map((course) => course.id)));

  const visibleExams = createMemo(() => {
    if (hasGlobalDashboardScope()) return exams() ?? [];
    const allowed = scopedCourseIds();
    if (allowed.size === 0) return [];
    return (exams() ?? []).filter((exam) => allowed.has(exam.course));
  });

  const courseCount = createMemo(() => {
    if (hasGlobalDashboardScope() && courses.loading) return null;
    if (!hasGlobalDashboardScope() && myCourses.loading) return null;
    return scopedCourses().length;
  });
  const totalExamsCount = createMemo(() => (exams.loading ? null : visibleExams().length));
  const totalEventsCount = createMemo(() => (events.loading ? null : events()?.length ?? 0));
  const totalNotesCount = createMemo(() => (notes.loading ? null : notes()?.length ?? 0));
  const displayCount = (count: number | null) => String(count ?? 0);

  const overallAvg = createMemo(() => marks()?.overall_average ?? null);

  const timeline = createMemo<TimelineItem[]>(() => {
    const examItems: TimelineItem[] = visibleExams().map((exam) => ({
      id: exam.id,
      type: "exam" as const,
      title: exam.title,
      at: exam.starts_at,
      subtitle: courseMap().get(exam.course) ?? examKindLabel(String(exam.kind), t),
    }));
    const allItems = [...eventItems(), ...examItems];
    const upcomingItems = allItems
      .filter((item) => item.at != null && item.at >= now())
      .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
    const fallbackItems = allItems
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
    return (upcomingItems.length > 0 ? upcomingItems : fallbackItems).slice(0, PREVIEW_LIMIT);
  });

  const chartData = createMemo(() => [
    { label: t("dashboard.stats.courses"), value: courseCount() ?? 0 },
    { label: t("dashboard.stats.exams"), value: totalExamsCount() ?? 0 },
    { label: t("dashboard.stats.events"), value: totalEventsCount() ?? 0 },
  ]);

  const maxChartValue = createMemo(() =>
    Math.max(1, ...chartData().map((d) => d.value)),
  );

  const cards = () => {
    const roleVal = role();
    const cc = displayCount(courseCount());
    const ec = displayCount(totalExamsCount());
    const evc = displayCount(totalEventsCount());
    const nc = displayCount(totalNotesCount());
    const avg = overallAvg() == null ? "0" : roundAvg(overallAvg()!);
    const list: PortalCard[] = [];

    if (roleVal === "student") {
      list.push(
        { icon: <IconSchool class="h-5 w-5" />, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc, statSuffix: "dashboard.records", accent: "violet" },
        { icon: <IconExam class="h-5 w-5" />, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec, statSuffix: "dashboard.records", accent: "amber" },
        { icon: <IconCalendar class="h-5 w-5" />, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc, statSuffix: "dashboard.records", accent: "sky" },
        { icon: <IconReportAnalytics class="h-5 w-5" />, titleKey: "nav.marks", to: "/marks", descKey: "dashboard.portal.marksDesc", stat: avg, accent: "mint" },
        { icon: <IconNote class="h-5 w-5" />, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc, statSuffix: "dashboard.records", accent: "rose" },
      );
    }

    if (roleVal === "teacher") {
      list.push(
        { icon: <IconSchool class="h-5 w-5" />, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc, statSuffix: "dashboard.records", accent: "violet" },
        { icon: <IconExam class="h-5 w-5" />, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec, statSuffix: "dashboard.records", accent: "amber" },
        { icon: <IconCalendar class="h-5 w-5" />, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc, statSuffix: "dashboard.records", accent: "sky", minRole: "teacher" },
        { icon: <IconChart class="h-5 w-5" />, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", stat: "", accent: "mint", minRole: "teacher" },
        { icon: <IconClipboardCheck class="h-5 w-5" />, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", stat: "", accent: "rose", minRole: "teacher" },
        { icon: <IconNote class="h-5 w-5" />, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc, statSuffix: "dashboard.records", accent: "sky" },
        { icon: <IconReportAnalytics class="h-5 w-5" />, titleKey: "nav.work", to: "/work", descKey: "dashboard.portal.workDesc", stat: "", accent: "amber", minRole: "teacher" },
      );
    }

    if (hasMinRole(roleVal, "manager")) {
      list.unshift(
        { icon: <IconSchool class="h-5 w-5" />, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc, statSuffix: "dashboard.records", accent: "violet" },
        { icon: <IconExam class="h-5 w-5" />, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec, statSuffix: "dashboard.records", accent: "amber" },
        { icon: <IconCalendar class="h-5 w-5" />, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc, statSuffix: "dashboard.records", accent: "sky" },
        { icon: <IconSettings class="h-5 w-5" />, titleKey: "nav.settings", to: "/management/settings", descKey: "dashboard.portal.settingsDesc", stat: "", accent: "mint", minRole: "manager" },
        { icon: <IconBook class="h-5 w-5" />, titleKey: "nav.terms", to: "/management/terms", descKey: "dashboard.portal.termsDesc", stat: "", accent: "rose", minRole: "manager" },
      );
      if (roleVal === "admin") {
        list.push(
          { icon: <IconUsers class="h-5 w-5" />, titleKey: "nav.users", to: "/admin/users", descKey: "dashboard.portal.usersDesc", stat: "", accent: "rose", minRole: "admin" },
        );
      }
    }

    return list;
  };

  return (
    <div class="space-y-5">
      <PageHeader compact accent="mint" title={t("dashboard.greeting", { name: fullName() })}>
        <div class="flex items-center gap-2">
          <Badge variant="outline" class="rounded-sm bg-background/60 text-xs font-medium">
            {t(ROLE_KEY[role()])}
          </Badge>
          <span class="text-xs text-muted-foreground">
            {formatDateTime(Date.now(), locale()).split(",")[0]}
          </span>
        </div>
      </PageHeader>

      <Show when={resourceError()}>
        {(msg) => <Alert variant="destructive">{msg()}</Alert>}
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
          <For each={cards()}>{(card) => <PortalCard card={card} />}</For>
        </div>

        <div class="grid gap-4 lg:grid-cols-2 auto-rows-fr">
          <UpcomingTimeline timeline={timeline()} locale={locale()} t={t} />
          <ActivityChart
            label={t("dashboard.activityGraph")}
            items={chartData()}
            maxValue={maxChartValue()}
          />
        </div>
      </Suspense>
    </div>
  );
}

function PortalCard(props: { card: PortalCard }) {
  const t = useT();
  const { icon, titleKey, to, descKey, stat: statValue, statSuffix, accent, minRole } = props.card;

  const iconAccentMap: Record<string, string> = {
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    mint: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };

  const dotMap: Record<string, string> = {
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    mint: "bg-emerald-500",
    rose: "bg-rose-500",
  };

  return (
    <Link
      to={to}
      class={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div
        class={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5 transition-colors duration-200",
          dotMap[accent],
        )}
      />
      <div class="flex items-center gap-2.5">
        <div
          class={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            iconAccentMap[accent],
          )}
        >
          {icon}
        </div>
        <h3 class="truncate font-display text-sm font-semibold">{t(titleKey)}</h3>
        <Show when={minRole && minRole !== "student"}>
          <span
            class={cn(
              "ml-auto rounded px-1 py-0.5 text-[9px] font-medium uppercase leading-none",
              ROLE_BADGE_TONE[minRole!],
            )}
          >
            {t(ROLE_KEY[minRole!])}
          </span>
        </Show>
      </div>
      <div class="mt-1 flex flex-1 flex-col justify-center">
        <Show when={statValue !== ""}>
          <div class="flex items-baseline gap-1 font-display text-xl font-bold tracking-tight">
            <span>{statValue}</span>
            <Show when={statSuffix}>
              {(suffix) => <span class="text-xs font-medium text-muted-foreground">{t(suffix())}</span>}
            </Show>
          </div>
        </Show>
        <p class="text-xs leading-relaxed text-muted-foreground">{t(descKey)}</p>
      </div>
    </Link>
  );
}

function UpcomingTimeline(props: {
  timeline: TimelineItem[];
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}) {
  return (
    <div class="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-xs">
      <div class="mb-4 flex items-center gap-2">
        <IconCalendar class="h-4 w-4 text-muted-foreground" />
        <h2 class="font-display text-sm font-semibold">{props.t("dashboard.upcoming")}</h2>
      </div>
      <Show
        when={props.timeline.length > 0}
        fallback={
          <p class="py-6 text-center text-sm text-muted-foreground">{props.t("dashboard.noEvents")}</p>
        }
      >
        <div class="space-y-3">
          <For each={props.timeline}>
            {(item) => (
              <Link
                to={item.type === "event" ? "/events/$id" : "/exams/$id"}
                params={{ id: item.id }}
                class="grid grid-cols-[28px_1fr] items-center gap-x-3 gap-y-0.5 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:border-border/60 hover:bg-muted/25"
              >
                <div
                  class={cn(
                    "row-span-2 flex h-7 w-7 items-center justify-center rounded-md",
                    item.type === "exam"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                  )}
                >
                  {item.type === "exam"
                    ? <IconExam class="h-3.5 w-3.5" />
                    : <IconCalendar class="h-3.5 w-3.5" />}
                </div>
                <p class="truncate font-medium">{item.title}</p>
                <p class="truncate text-xs text-muted-foreground">
                  <Show when={item.at != null} fallback={props.t("exams.unscheduled")}>
                    {formatDateTime(item.at!, props.locale)}
                  </Show>
                  <Show when={item.subtitle}>
                    {" · "}{item.subtitle}
                  </Show>
                </p>
              </Link>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function ActivityChart(props: {
  label: string;
  items: { label: string; value: number }[];
  maxValue: number;
}) {
  return (
    <div class="flex flex-col rounded-xl border border-border/60 bg-card p-5 shadow-xs">
      <div class="mb-4 flex items-center gap-2">
        <IconChart class="h-4 w-4 text-muted-foreground" />
        <h2 class="font-display text-sm font-semibold">{props.label}</h2>
      </div>
      <div class="space-y-3">
        <For each={props.items}>
          {(item, i) => (
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{item.label}</span>
                <span class="font-semibold tabular-nums">{item.value}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  class={cn(
                    "h-full rounded-full transition-all duration-500",
                    CHART_TONES[i() % CHART_TONES.length],
                  )}
                  style={{ width: `${(item.value / props.maxValue) * 100}%` }}
                />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
