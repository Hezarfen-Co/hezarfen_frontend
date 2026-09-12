import { For, Show, Suspense, createMemo, createResource, type Component } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role } from "@/api/client";
import { formatApiError } from "@/api/client";
import { getAppointments } from "@/api/appointments";
import { getMyClasses } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { getExams, getExamStatistics } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getMealMenus } from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getPomodoroMe } from "@/api/pomodoro";
import { getMyAttendance, getMyCourses, getMyMarks } from "@/api/reports";
import { getTime } from "@/api/time/getTime";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { ChartBar } from "@/components/ui/chart-bar";
import { ChartHeatmap, type HeatmapEntry } from "@/components/ui/chart-heatmap";
import { ChartLine } from "@/components/ui/chart-line";
import { ChartProgressRing } from "@/components/ui/chart-progress-ring";
import { DataTable } from "@/components/ui/data-table";
import {
  IconBook,
  IconCalendarDays,
  IconChart,
  IconClipboardCheck,
  IconExam,
  IconHomework,
  IconUsers,
  IconUtensils,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** Weeks covered by the bottom activity heatmap. */
const HEATMAP_WEEKS = 26;
/**
 * Exams pulled into the teacher+ success trend. Each one costs a separate
 * `/exams/{id}/statistics` call — there is no bulk statistics endpoint — so the
 * homepage keeps a bounded recent history.
 */
const TREND_EXAM_CAP = 20;
/** Marks plotted in a student's own trend. */
const TREND_MARK_CAP = 20;

type Status = "active" | "today" | "soon";
type DeadlineKind = "exam" | "event" | "appointment" | "homework";

type DeadlineRow = {
  id: string;
  kind: DeadlineKind;
  title: string;
  at: number;
  status: Status;
};

type StatCardData = {
  labelKey: MessageKey;
  value: string;
  Icon: Component<{ class?: string }>;
};

const roleKeys: Record<Role, MessageKey> = {
  student: "role.student",
  parent: "role.parent",
  teacher: "role.teacher",
  manager: "role.manager",
  admin: "role.admin",
};

const kindKeys: Record<DeadlineKind, MessageKey> = {
  exam: "dashboard.type.exam",
  event: "dashboard.type.event",
  appointment: "dashboard.type.appointment",
  homework: "dashboard.type.homework",
};

function scheduleStatus(startsAt: number | null, endsAt: number | null, now: number): Status | null {
  if (startsAt == null || (endsAt ?? startsAt) < now) return null;
  if (startsAt <= now) return "active";
  if (startsAt - now <= DAY_MS) return "today";
  if (startsAt - now <= WEEK_MS) return "soon";
  return null;
}

export default function DashboardPage() {
  return <RouteGuard><DashboardContent /></RouteGuard>;
}

function DashboardContent() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const user = () => auth.user()!;
  const role = () => user().role;
  const [clock] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  // Unpaged: the backend has no `kind` filter, so a "courses" count that
  // excludes studies and clubs has to be counted here over the whole list.
  const [courses] = createResource(
    () => role() === "parent" ? null : role(),
    (currentRole) => currentRole === "student" ? getMyCourses() : getCourses(),
  );
  const courseCount = () => (courses()?.items ?? []).filter((course) => course.kind === "course").length;
  const [events] = createResource(
    () => role() === "parent" ? null : clock()?.now,
    (now) => getEvents({ ends_after: now, limit: 50 }),
  );
  const [exams] = createResource(
    () => role() === "parent" ? null : role(),
    () => getExams({ limit: 100 }),
  );
  // Unfiltered: `/homework` has no due-date window, so this one read serves both
  // the deadlines table (filtered by `scheduleStatus`) and the backwards-looking
  // heatmap.
  const [homework] = createResource(
    () => role() === "parent" ? null : role(),
    () => getHomework({ limit: 100 }),
  );
  const [children] = createResource(
    () => role() === "parent" ? true : null,
    () => getMyStudents({ limit: 12 }),
  );
  const [appointments] = createResource(() => getAppointments({ limit: 20 }));
  const [menus] = createResource(
    () => clock()?.now,
    (now) => getMealMenus({ from: new Date(now).toISOString().slice(0, 10), limit: 1 }),
  );
  const [marks] = createResource(
    () => role() === "student" ? true : null,
    () => getMyMarks(),
  );
  const [attendance] = createResource(
    () => role() === "student" ? true : null,
    () => getMyAttendance(),
  );
  const [myClasses] = createResource(
    () => role() === "student" ? true : null,
    () => getMyClasses({ limit: 1 }),
  );
  // Focus heatmap source. Only a student owns pomodoro sessions — reading
  // another user's log is the teacher+ /management/pomodoros page's job.
  const [pomodoro] = createResource(
    () => role() === "student" ? true : null,
    () => getPomodoroMe({ limit: 400 }),
  );
  // `/events` is the one list here that really is filtered server-side, by the
  // `ends_after` window the deadlines table needs. The heatmap looks backwards
  // and there is no "before" filter, so past events need their own read.
  const [pastEvents] = createResource(
    () => hasMinRole(role(), "teacher") ? true : null,
    () => getEvents({ limit: 100 }).catch(() => null),
  );
  // Success trend source for teacher+. Exam statistics are grader-only, so this
  // never runs for a student or parent — they would get a 403.
  const [examStats] = createResource(
    () => hasMinRole(role(), "teacher") ? exams.latest?.items ?? null : null,
    async (items) => {
      const recent = items
        .filter((exam) => !exam.draft && exam.starts_at != null && exam.starts_at <= now())
        .sort((a, b) => b.starts_at! - a.starts_at!)
        .slice(0, TREND_EXAM_CAP);
      const settled = await Promise.all(
        recent.map(async (exam) => {
          try {
            return { exam, stats: await getExamStatistics(exam.id) };
          } catch {
            // One ungraded or forbidden exam must not blank the whole panel.
            return { exam, stats: null };
          }
        }),
      );
      return settled
        .filter((row) => row.stats?.average != null)
        .sort((a, b) => a.exam.starts_at! - b.exam.starts_at!);
    },
  );
  const myClass = () => myClasses.latest?.items[0] ?? null;

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;
  const now = () => clock()?.now ?? Date.now();
  const trendDateFormatter = createMemo(() => new Intl.DateTimeFormat(
    locale() === "tr" ? "tr-TR" : "en-GB",
    { day: "2-digit", month: "short" },
  ));
  const formatTrendDate = (timestamp: number) => trendDateFormatter().format(timestamp);

  const attendanceRate = createMemo(() => {
    const report = attendance();
    if (!report) return null;
    const total = report.events.total + report.sessions.total;
    const present = report.events.present + report.sessions.present;
    return total ? Math.round((present / total) * 100) : null;
  });

  const stats = createMemo<StatCardData[]>(() => {
    const r = role();
    if (r === "student") {
      return [
        { labelKey: "dashboard.stats.courses", value: String(courseCount()), Icon: IconBook },
        { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
        { labelKey: "dashboard.stats.average", value: marks()?.overall_average == null ? "—" : marks()!.overall_average!.toFixed(1), Icon: IconChart },
        { labelKey: "dashboard.stats.attendance", value: attendanceRate() == null ? "—" : `${attendanceRate()}%`, Icon: IconClipboardCheck },
      ];
    }
    if (r === "teacher") {
      return [
        { labelKey: "dashboard.stats.courses", value: String(courseCount()), Icon: IconBook },
        { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
        { labelKey: "dashboard.stats.events", value: String(events()?.total ?? 0), Icon: IconCalendarDays },
        { labelKey: "dashboard.stats.homework", value: String(homework()?.total ?? 0), Icon: IconHomework },
      ];
    }
    if (r === "parent") {
      return [
        { labelKey: "dashboard.stats.children", value: String(children()?.total ?? 0), Icon: IconUsers },
        { labelKey: "dashboard.stats.appointments", value: String(appointments()?.total ?? 0), Icon: IconCalendarDays },
        { labelKey: "dashboard.stats.meals", value: String(menus()?.total ?? 0), Icon: IconUtensils },
      ];
    }
    return [
      { labelKey: "dashboard.stats.courses", value: String(courseCount()), Icon: IconBook },
      { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
      { labelKey: "dashboard.stats.events", value: String(events()?.total ?? 0), Icon: IconCalendarDays },
      { labelKey: "dashboard.stats.meals", value: String(menus()?.total ?? 0), Icon: IconUtensils },
    ];
  });

  // Student trend — own marks ordered by their exam's date. Marks whose exam
  // falls outside the fetched exam page carry no date and are left out rather
  // than guessed into the sequence.
  const myMarkTrend = createMemo(() => {
    const report = marks();
    if (!report) return [];
    const examDates = new Map((exams()?.items ?? []).map((exam) => [exam.id, exam.starts_at]));
    return report.courses
      .flatMap((course) =>
        course.results.map((result) => ({
          id: `${course.course.id}:${result.exam}`,
          label: `${course.course.title}: ${result.title}`,
          value: result.mark,
          at: examDates.get(result.exam) ?? null,
        })),
      )
      .filter((row): row is typeof row & { at: number } => row.at != null)
      .sort((a, b) => a.at - b.at)
      .slice(-TREND_MARK_CAP)
      .map((row) => ({
        id: row.id,
        label: row.label,
        value: row.value,
        formattedValue: row.value.toFixed(1),
        caption: formatTrendDate(row.at),
      }));
  });

  // Teacher+ trend — the backend's own per-exam average, oldest exam first.
  const examAverageTrend = createMemo(() => {
    const titles = new Map((courses()?.items ?? []).map((course) => [course.id, course.title]));
    return (examStats() ?? []).map((row) => ({
      id: row.exam.id,
      label: `${titles.get(row.exam.course) ?? row.exam.course}: ${row.exam.title}`,
      value: row.stats!.average!,
      formattedValue: row.stats!.average!.toFixed(1),
      caption: formatTrendDate(row.exam.starts_at!),
    }));
  });

  // Teacher+ comparison — the same exam averages grouped by course, so a weak
  // subject stands out rather than being averaged into one school-wide number.
  const courseAverageBars = createMemo(() => {
    const titles = new Map((courses()?.items ?? []).map((course) => [course.id, course.title]));
    const buckets = new Map<string, number[]>();
    for (const row of examStats() ?? []) {
      const list = buckets.get(row.exam.course) ?? [];
      list.push(row.stats!.average!);
      buckets.set(row.exam.course, list);
    }
    return [...buckets.entries()]
      .map(([courseId, averages]) => {
        const mean = averages.reduce((sum, value) => sum + value, 0) / averages.length;
        return {
          id: courseId,
          label: titles.get(courseId) ?? courseId,
          value: mean,
          formattedValue: mean.toFixed(1),
        };
      })
      .sort((a, b) => b.value - a.value);
  });

  // Student progress panel — per-course averages from the marks report.
  const courseAverages = createMemo(() =>
    (marks()?.courses ?? [])
      .filter((c) => c.average != null)
      .map((c) => ({ id: c.course.id, label: c.course.title, value: c.average!, formattedValue: c.average!.toFixed(1) })),
  );

  // Weekly activity split — student attendance breakdown (events + sessions).
  const attendanceSegments = createMemo(() => {
    const report = attendance();
    if (!report) return [];
    const sum = (k: "present" | "absent" | "late" | "excused") => report.events[k] + report.sessions[k];
    return [
      { id: "present", label: t("dashboard.attend.present"), value: sum("present"), colorClass: "bg-emerald-500" },
      { id: "absent", label: t("dashboard.attend.absent"), value: sum("absent"), colorClass: "bg-rose-500" },
      { id: "late", label: t("dashboard.attend.late"), value: sum("late"), colorClass: "bg-amber-500" },
      { id: "excused", label: t("dashboard.attend.excused"), value: sum("excused"), colorClass: "bg-muted-foreground/40" },
    ];
  });

  // Bottom heatmap. A student's own focus minutes; every other role gets the
  // dated records they already read on this page — nobody's grid is built from
  // an endpoint their role cannot call.
  const heatmapIsFocus = () => role() === "student";
  const heatmapEntries = createMemo<HeatmapEntry[]>(() => {
    if (heatmapIsFocus()) {
      return (pomodoro()?.items ?? [])
        .filter((session) => session.duration_ms != null && session.duration_ms > 0)
        .map((session) => ({ at: session.started_at, value: Math.round(session.duration_ms! / 60000) }));
    }
    if (role() === "parent") {
      return (appointments()?.items ?? [])
        .filter((appointment) => appointment.starts_at != null)
        .map((appointment) => ({ at: appointment.starts_at!, value: 1 }));
    }
    // Exams and homework are already read unfiltered, so they carry their own
    // past; only events need the backwards-looking read.
    return [
      ...(exams()?.items ?? []).filter((exam) => exam.starts_at != null).map((exam) => ({ at: exam.starts_at!, value: 1 })),
      ...(pastEvents()?.items ?? []).filter((event) => event.starts_at != null).map((event) => ({ at: event.starts_at!, value: 1 })),
      ...(homework()?.items ?? []).map((hw) => ({ at: hw.due_at, value: 1 })),
    ];
  });

  const heatmapDateFormat = createMemo(
    () => new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short" }),
  );
  const heatmapTotal = createMemo(() => {
    const cutoff = now() - HEATMAP_WEEKS * WEEK_MS;
    return heatmapEntries()
      .filter((entry) => entry.at >= cutoff && entry.at <= now())
      .reduce((sum, entry) => sum + entry.value, 0);
  });

  const deadlines = createMemo<DeadlineRow[]>(() => {
    const items: DeadlineRow[] = [];
    for (const exam of exams()?.items ?? []) {
      const status = scheduleStatus(exam.starts_at, exam.ends_at, now());
      if (status) items.push({ id: exam.id, kind: "exam", title: exam.title, at: exam.starts_at!, status });
    }
    for (const event of events()?.items ?? []) {
      const status = scheduleStatus(event.starts_at, event.ends_at, now());
      if (status) items.push({ id: event.id, kind: "event", title: event.title, at: event.starts_at!, status });
    }
    for (const hw of homework()?.items ?? []) {
      const status = scheduleStatus(hw.due_at, hw.due_at, now());
      if (status) items.push({ id: hw.id, kind: "homework", title: hw.title, at: hw.due_at, status });
    }
    for (const appointment of appointments()?.items ?? []) {
      if (appointment.starts_at == null || !["pending", "approved"].includes(appointment.status)) continue;
      const status = scheduleStatus(appointment.starts_at, appointment.ends_at, now());
      if (status) {
        const person = appointment.teacher?.display_name || appointment.teacher?.username || t("nav.appointments");
        items.push({ id: appointment.id, kind: "appointment", title: person, at: appointment.starts_at, status });
      }
    }
    return items.sort((a, b) => a.at - b.at);
  });

  const headerClass = "text-xs font-medium text-muted-foreground";
  const deadlineColumns = createMemo<ColumnDef<DeadlineRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("dashboard.col.task"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => <span class="block truncate font-medium">{info.row.original.title}</span>,
    },
    {
      accessorKey: "kind",
      header: t("dashboard.col.type"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => <span class="text-muted-foreground">{t(kindKeys[info.row.original.kind])}</span>,
    },
    {
      accessorKey: "at",
      header: t("dashboard.col.dueDate"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => <span class="tabular-nums text-muted-foreground">{formatDateTime(info.row.original.at, locale())}</span>,
    },
    {
      accessorKey: "status",
      header: t("dashboard.col.status"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => {
        const s = info.row.original.status;
        return (
          <Badge variant="outline" class="rounded-full text-[10px]">
            <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", s === "active" ? "bg-emerald-500" : s === "today" ? "bg-amber-500" : "bg-muted-foreground/50")} />
            {s === "active" ? t("dashboard.activeNow") : s === "today" ? t("dashboard.today") : t("dashboard.soon")}
          </Badge>
        );
      },
    },
  ]);

  const deadlineSearch = (row: DeadlineRow, q: string) => row.title.toLowerCase().includes(q.toLowerCase());
  const openDeadline = (row: DeadlineRow) => {
    switch (row.kind) {
      case "exam":
        return navigate({ to: "/exams/$id", params: { id: row.id } });
      case "event":
        return navigate({ to: "/events/$id", params: { id: row.id } });
      case "homework":
        return navigate({ to: "/homework/$id", params: { id: row.id } });
      case "appointment":
        return navigate({ to: "/appointments" });
    }
  };

  const error = createMemo(() => {
    const problem = courses.error || events.error || exams.error || homework.error || children.error || appointments.error || menus.error || marks.error || attendance.error || myClasses.error || pomodoro.error;
    return problem ? formatApiError(problem, locale()) : "";
  });

  return (
    <div class="space-y-6">
        <header class="flex min-h-[66px] flex-wrap items-center justify-between gap-3 border-b border-border-hairline pb-4">
          <div class="space-y-1">
            <h1 class="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-text-strong">{t("dashboard.welcomeBack", { name: fullName() })}</h1>
            <p class="text-sm text-text-subtle">{t("dashboard.welcomeHint")}</p>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="bg-surface-overlay">{t(roleKeys[role()])}</Badge>
            <Show when={myClass()}>
              {(cls) => <Badge variant="outline" class="bg-surface-overlay">{cls().name}</Badge>}
            </Show>
            <time class="text-sm tabular-nums text-text-subtle">
              {new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium" }).format(now())}
            </time>
          </div>
        </header>

        <Suspense fallback={<PageSpinner />}>
          <Show when={error()}>
            <p class="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error()}</p>
          </Show>

          <section class="space-y-3" aria-labelledby="highlights-heading">
            <h2 id="highlights-heading" class="text-sm font-semibold text-text-strong">{t("dashboard.highlights")}</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <For each={stats()}>
                {(stat) => (
                  <div class="rounded-xl border border-border-line bg-surface-base px-4 py-4">
                    <div class="flex items-center gap-2">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-tint text-text-subtle">
                        <stat.Icon class="h-4 w-4" />
                      </span>
                      <p class="min-w-0 flex-1 truncate text-xs font-medium text-text-subtle">{t(stat.labelKey)}</p>
                    </div>
                    <div class="mt-3">
                      <p class="mono tabular-nums text-2xl font-semibold tracking-[-0.02em] text-text-strong">{stat.value}</p>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </section>

          <Show when={role() !== "parent"}>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Show when={role() === "student"}>
                <ChartBar
                  title={t("dashboard.progressOverview")}
                  subtitle={t("dashboard.courseAverages")}
                  items={courseAverages()}
                  maxScale={100}
                  itemsPerPage={5}
                />
                <ChartLine
                  title={t("dashboard.successTrend")}
                  subtitle={t("dashboard.successTrendMine")}
                  items={myMarkTrend()}
                  maxScale={100}
                />
                <ChartProgressRing
                  title={t("dashboard.activitySplit")}
                  subtitle={t("dashboard.activitySplitDesc")}
                  segments={attendanceSegments()}
                  itemsPerPage={3}
                />
              </Show>
              <Show when={role() !== "student"}>
                <ChartLine
                  class="lg:col-span-2"
                  title={t("dashboard.successTrend")}
                  subtitle={t("dashboard.successTrendSchool")}
                  items={examAverageTrend()}
                  maxScale={100}
                />
                <ChartBar
                  title={t("dashboard.courseAverages")}
                  subtitle={t("dashboard.courseAveragesSchool")}
                  items={courseAverageBars()}
                  maxScale={100}
                  itemsPerPage={5}
                />
              </Show>
            </div>
          </Show>

          <section class="flex flex-col gap-4 rounded-xl border border-border-line bg-surface-base p-4" aria-labelledby="deadlines-heading">
            <h2 id="deadlines-heading" class="text-base font-semibold tracking-tight">{t("dashboard.deadlines")}</h2>
            <DataTable
              columns={deadlineColumns()}
              data={deadlines()}
              enableColumnVisibility={false}
              searchPredicate={deadlines().length > 0 ? deadlineSearch : undefined}
              empty={t("dashboard.upcomingEmpty")}
              onRowClick={openDeadline}
            />
          </section>

          <ChartHeatmap
            title={heatmapIsFocus() ? t("dashboard.focusHeatmap") : t("dashboard.activityHeatmap")}
            subtitle={heatmapIsFocus() ? t("dashboard.focusHeatmapDesc") : t("dashboard.activityHeatmapDesc")}
            entries={heatmapEntries()}
            weeks={HEATMAP_WEEKS}
            endsAt={now()}
            dayLabel={(value, dayStart) =>
              heatmapIsFocus()
                ? t("dashboard.heatmapFocusDay", { date: heatmapDateFormat().format(dayStart), count: String(value) })
                : t("dashboard.heatmapRecordDay", { date: heatmapDateFormat().format(dayStart), count: String(value) })
            }
            emptyDayLabel={(dayStart) =>
              heatmapIsFocus()
                ? t("dashboard.heatmapFocusEmpty", { date: heatmapDateFormat().format(dayStart) })
                : t("dashboard.heatmapRecordEmpty", { date: heatmapDateFormat().format(dayStart) })
            }
            footer={
              heatmapIsFocus()
                ? t("dashboard.heatmapFocusTotal", { count: String(heatmapTotal()), weeks: String(HEATMAP_WEEKS) })
                : t("dashboard.heatmapRecordTotal", { count: String(heatmapTotal()), weeks: String(HEATMAP_WEEKS) })
            }
          />
        </Suspense>
    </div>
  );
}
