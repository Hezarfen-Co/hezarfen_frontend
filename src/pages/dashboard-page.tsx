import { For, Show, Suspense, createMemo, createResource, createSignal, type Component } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role } from "@/api/client";
import { formatApiError } from "@/api/client";
import { getAppointments } from "@/api/appointments";
import { getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getMealMenus } from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getMyAttendance, getMyCourses, getMyMarks } from "@/api/reports";
import { getTime } from "@/api/time/getTime";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { ChartAreaTrend } from "@/components/ui/chart-area-trend";
import { ChartBar } from "@/components/ui/chart-bar";
import { ChartProgressRing } from "@/components/ui/chart-progress-ring";
import { DataTable } from "@/components/ui/data-table";
import {
  IconArchive,
  IconBook,
  IconCalendarDays,
  IconChart,
  IconClipboardCheck,
  IconExam,
  IconHelpCircle,
  IconHomework,
  IconRefresh,
  IconSearch,
  IconUsers,
  IconUtensils,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

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
  spark?: number[];
};

// Tiny real-data sparkline; renders nothing when there's no series.
function StatSpark(props: { values: number[] }) {
  const pts = () => {
    const v = props.values;
    if (v.length < 2) return "";
    const min = Math.min(...v);
    const max = Math.max(...v);
    const range = max - min || 1;
    const w = 64;
    const h = 24;
    return v
      .map((val, i) => {
        const x = (i / (v.length - 1)) * w;
        const y = h - ((val - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  return (
    <Show when={pts()}>
      <svg viewBox="0 0 64 24" class="h-6 w-16 shrink-0 overflow-visible" preserveAspectRatio="none">
        <polyline points={pts()} fill="none" stroke="hsl(var(--primary))" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
    </Show>
  );
}

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
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const user = () => auth.user()!;
  const role = () => user().role;
  const [clock, clockQ] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [courses, coursesQ] = createResource(
    () => role() === "parent" ? null : role(),
    (currentRole) => currentRole === "student"
      ? getMyCourses({ kind: "course", limit: 12 })
      : getCourses({ kind: "course", limit: 12 }),
  );
  const [events, eventsQ] = createResource(
    () => role() === "parent" ? null : clock()?.now,
    (now) => getEvents({ ends_after: now, limit: 50 }),
  );
  const [exams, examsQ] = createResource(
    () => role() === "parent" ? null : role(),
    () => getExams({ limit: 50 }),
  );
  const [homework, homeworkQ] = createResource(
    () => role() === "parent" ? null : clock()?.now,
    (now) => getHomework({ due_after: now, limit: 50 }),
  );
  const [children, childrenQ] = createResource(
    () => role() === "parent" ? true : null,
    () => getMyStudents({ limit: 12 }),
  );
  const [appointments, appointmentsQ] = createResource(
    () => role() === "parent" ? true : null,
    () => getAppointments({ limit: 20 }),
  );
  const [menus, menusQ] = createResource(
    () => clock()?.now,
    (now) => getMealMenus({ from: new Date(now).toISOString().slice(0, 10), limit: 1 }),
  );
  const [marks, marksQ] = createResource(
    () => role() === "student" ? true : null,
    () => getMyMarks(),
  );
  const [attendance, attendanceQ] = createResource(
    () => role() === "student" ? true : null,
    () => getMyAttendance(),
  );

  const [refreshing, setRefreshing] = createSignal(false);
  const refresh = async () => {
    if (refreshing()) return;
    setRefreshing(true);
    try {
      await Promise.all(
        [clockQ, coursesQ, eventsQ, examsQ, homeworkQ, childrenQ, appointmentsQ, menusQ, marksQ, attendanceQ]
          .map((q) => q.refetch()),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;
  const now = () => clock()?.now ?? Date.now();

  const attendanceRate = createMemo(() => {
    const report = attendance();
    if (!report) return null;
    const total = report.events.total + report.sessions.total;
    const present = report.events.present + report.sessions.present;
    return total ? Math.round((present / total) * 100) : null;
  });

  const capacities = () =>
    (courses()?.items ?? []).map((c) => c.capacity).filter((n): n is number => n != null);
  const courseAvgValues = () =>
    (marks()?.courses ?? []).filter((c) => c.average != null).map((c) => c.average!);
  const attendanceValues = () => {
    const report = attendance();
    if (!report) return [];
    const sum = (k: "present" | "absent" | "late" | "excused") => report.events[k] + report.sessions[k];
    return [sum("present"), sum("late"), sum("excused"), sum("absent")];
  };

  const stats = createMemo<StatCardData[]>(() => {
    const r = role();
    if (r === "student") {
      return [
        { labelKey: "dashboard.stats.courses", value: String(courses()?.total ?? 0), Icon: IconBook, spark: capacities() },
        { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
        { labelKey: "dashboard.stats.average", value: marks()?.overall_average == null ? "—" : marks()!.overall_average!.toFixed(1), Icon: IconChart, spark: courseAvgValues() },
        { labelKey: "dashboard.stats.attendance", value: attendanceRate() == null ? "—" : `${attendanceRate()}%`, Icon: IconClipboardCheck, spark: attendanceValues() },
      ];
    }
    if (r === "teacher") {
      return [
        { labelKey: "dashboard.stats.courses", value: String(courses()?.total ?? 0), Icon: IconBook, spark: capacities() },
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
      { labelKey: "dashboard.stats.courses", value: String(courses()?.total ?? 0), Icon: IconBook, spark: capacities() },
      { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
      { labelKey: "dashboard.stats.events", value: String(events()?.total ?? 0), Icon: IconCalendarDays },
      { labelKey: "dashboard.stats.meals", value: String(menus()?.total ?? 0), Icon: IconUtensils },
    ];
  });

  // Progress panel — student: per-course averages; teacher/manager/admin: class sizes.
  const courseAverages = createMemo(() =>
    (marks()?.courses ?? [])
      .filter((c) => c.average != null)
      .map((c) => ({ label: c.course.title, value: c.average!, formattedValue: c.average!.toFixed(1) })),
  );
  const classSizes = createMemo(() =>
    (courses()?.items ?? [])
      .filter((c) => c.capacity != null)
      .map((c) => ({ id: c.id, label: c.title, value: c.capacity! })),
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

  // Right-side "workload split" for non-student roles — real resource totals.
  const workloadSegments = createMemo(() => {
    const r = role();
    const base = [
      { id: "courses", label: t("nav.classes"), value: courses()?.total ?? 0, colorClass: "bg-primary" },
      { id: "exams", label: t("nav.exams"), value: exams()?.total ?? 0, colorClass: "bg-blue-500" },
      { id: "events", label: t("nav.events"), value: events()?.total ?? 0, colorClass: "bg-emerald-500" },
    ];
    if (r === "teacher") {
      return [...base, { id: "homework", label: t("nav.homework"), value: homework()?.total ?? 0, colorClass: "bg-rose-500" }];
    }
    return [...base, { id: "meals", label: t("nav.meals"), value: menus()?.total ?? 0, colorClass: "bg-rose-500" }];
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
      cell: (info) => <span class="font-medium">{info.row.original.title}</span>,
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
    {
      id: "priority",
      header: t("dashboard.col.priority"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => {
        const high = info.row.original.status !== "soon";
        return (
          <span class={cn("text-xs font-semibold", high ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
            {high ? t("dashboard.priority.high") : t("dashboard.priority.medium")}
          </span>
        );
      },
    },
  ]);

  const deadlineSearch = (row: DeadlineRow, q: string) => row.title.toLowerCase().includes(q.toLowerCase());

  const error = createMemo(() => {
    const problem = courses.error || events.error || exams.error || homework.error || children.error || appointments.error || menus.error || marks.error || attendance.error;
    return problem ? formatApiError(problem, locale()) : "";
  });

  return (
    <RouteGuard>
      <div class="space-y-5">
        <header class="flex flex-wrap items-end justify-between gap-3">
          <div class="space-y-1">
            <h1 class="font-display text-2xl font-semibold tracking-tight">{t("dashboard.welcomeBack", { name: fullName() })}</h1>
            <p class="text-sm text-muted-foreground">{t("dashboard.welcomeHint")}</p>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="rounded-full bg-muted/40">{t(roleKeys[role()])}</Badge>
            <time class="text-sm tabular-nums text-muted-foreground">
              {new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium" }).format(now())}
            </time>
          </div>
        </header>

        <Suspense fallback={<PageSpinner />}>
          <Show when={error()}>
            <p class="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error()}</p>
          </Show>

          <section class="space-y-3" aria-labelledby="highlights-heading">
            <h2 id="highlights-heading" class="text-sm font-semibold">{t("dashboard.highlights")}</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <For each={stats()}>
                {(stat) => (
                  <div class="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-xs">
                    <div class="flex items-center gap-2">
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground">
                        <stat.Icon class="h-4 w-4" />
                      </span>
                      <p class="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">{t(stat.labelKey)}</p>
                    </div>
                    <div class="mt-3 flex items-end justify-between gap-2">
                      <p class="mono tabular-nums text-2xl font-bold tracking-tight">{stat.value}</p>
                      <Show when={stat.spark}>{(s) => <StatSpark values={s()} />}</Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </section>

          <Show when={role() !== "parent"}>
            <div class="grid gap-3 lg:grid-cols-3">
              <Show when={role() === "student"}>
                <ChartAreaTrend
                  class="lg:col-span-2"
                  title={t("dashboard.progressOverview")}
                  subtitle={t("dashboard.courseAverages")}
                  items={courseAverages()}
                  minScale={0}
                  maxScale={100}
                />
              </Show>
              <Show when={role() !== "student"}>
                <ChartBar
                  class="lg:col-span-2"
                  title={t("dashboard.progressOverview")}
                  subtitle={t("dashboard.classSizes")}
                  items={classSizes()}
                />
              </Show>
              <Show when={role() === "student"}>
                <ChartProgressRing
                  title={t("dashboard.activitySplit")}
                  subtitle={t("dashboard.activitySplitDesc")}
                  segments={attendanceSegments()}
                />
              </Show>
              <Show when={role() !== "student"}>
                <ChartProgressRing
                  title={t("dashboard.workloadSplit")}
                  subtitle={t("dashboard.workloadSplitDesc")}
                  segments={workloadSegments()}
                />
              </Show>
            </div>
          </Show>

          <div class="grid gap-3 lg:grid-cols-3">
            <section class={cn("flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs", role() !== "parent" ? "lg:col-span-2" : "lg:col-span-3")} aria-labelledby="deadlines-heading">
              <h2 id="deadlines-heading" class="text-base font-semibold tracking-tight">{t("dashboard.deadlines")}</h2>
              <DataTable
                columns={deadlineColumns()}
                data={deadlines()}
                enableColumnVisibility={false}
                searchPredicate={deadlineSearch}
                filterPlaceholder={t("dashboard.deadlines")}
                empty={t("dashboard.upcomingEmpty")}
              />
            </section>

            <Show when={role() !== "parent"}>
              <section class="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs lg:col-span-1" aria-labelledby="review-heading">
                <div class="space-y-1">
                  <h2 id="review-heading" class="text-base font-semibold tracking-tight">{t("nav.questionBank")}</h2>
                  <p class="text-sm text-muted-foreground">{t("dashboard.questionHubDesc")}</p>
                </div>
                <Link
                  to="/question-bank"
                  class="flex h-10 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 text-sm text-muted-foreground outline-hidden transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <IconSearch class="h-4 w-4 shrink-0" />
                  <span class="truncate">{t("dashboard.questionHubPlaceholder")}</span>
                </Link>
                <div class="flex items-center gap-2">
                  <For each={[IconArchive, IconHelpCircle, IconExam, IconBook, IconChart]}>
                    {(Icon) => (
                      <span class="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground">
                        <Icon class="h-4 w-4" />
                      </span>
                    )}
                  </For>
                </div>
                <div class="mt-auto grid grid-cols-2 gap-2">
                  <Link
                    to="/question-bank"
                    class="flex h-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold outline-hidden transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("nav.questionBank")}
                  </Link>
                  <Link
                    to="/questions"
                    class="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground outline-hidden transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("dashboard.askQuestion")}
                  </Link>
                </div>
              </section>
            </Show>
          </div>

          <div class="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing()}
              class="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-semibold text-muted-foreground outline-hidden transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              <IconRefresh class={cn("h-3.5 w-3.5", refreshing() && "animate-spin")} />
              {t("dashboard.refresh")}
            </button>
          </div>
        </Suspense>
      </div>
    </RouteGuard>
  );
}
