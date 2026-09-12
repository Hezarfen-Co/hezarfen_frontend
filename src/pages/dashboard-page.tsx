import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup, type Component } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role } from "@/api/client";
import { formatApiError } from "@/api/client";
import { getAppointments } from "@/api/appointments";
import { getClasses, getClassesByUserId, getMyClasses } from "@/api/classes";
import { getCourseEnrollments, getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { getExams, getExamStatistics } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getMealMenus } from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getPaymentStatementByUserId } from "@/api/payments";
import { getPomodoroMe } from "@/api/pomodoro";
import { getMyAttendance, getMyCourses, getMyMarks, getUserAttendance } from "@/api/reports";
import { getTime } from "@/api/time/getTime";
import { getUsers, getUserSearch } from "@/api/users";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge, ComingSoonPanel } from "@/components/ui/coming-soon";
import { ChartBar } from "@/components/ui/chart-bar";
import { ChartHeatmap, type HeatmapEntry } from "@/components/ui/chart-heatmap";
import { ChartLine } from "@/components/ui/chart-line";
import { ChartProgressRing } from "@/components/ui/chart-progress-ring";
import { DataTable } from "@/components/ui/data-table";
import { QuickLinkColumn, type QuickLinkRow } from "@/components/dashboard/quick-link-column";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  IconBook,
  IconCalendarDays,
  IconChart,
  IconClipboardCheck,
  IconClock,
  IconExam,
  IconHomework,
  IconSearch,
  IconUsers,
  IconUtensils,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { formatTry } from "@/lib/meals";
import { personLabel } from "@/lib/person";
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
type DeadlineKind = "exam" | "event" | "appointment" | "homework" | "payment";

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
  payment: "dashboard.type.payment",
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
  // `/events` has no role gate — a parent-teacher conference is a real PAR-01
  // "Yaklaşan" item, so parent reads this too (unlike `exams`/`homework`
  // below, which really are course-scoped and out of a parent's reach).
  const [events] = createResource(
    () => clock()?.now,
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

  // TCH-01 "Öğrencim" stat — Course carries no enrolled-count field, so this
  // reads each of the teacher's own courses' enrollment page and unions the
  // user ids. Bounded to a handful of courses, the same cost shape as the
  // admin quick-link class-member lookups.
  const [teacherStudentCount] = createResource(
    () => (role() === "teacher" ? courses.latest?.items ?? null : null),
    async (items) => {
      const settled = await Promise.all(
        items.slice(0, 20).map((course) => getCourseEnrollments(course.id, { limit: 200 }).catch(() => null)),
      );
      const ids = new Set<string>();
      for (const page of settled) for (const enrollment of page?.items ?? []) ids.add(enrollment.user.id);
      return ids.size;
    },
  );

  // TCH-01 "Bekleyen onaylar" rail — the AI suggestion queue itself has no
  // backend endpoint, but a real pending appointment request addressed to
  // this teacher is exactly the kind of thing that rail is for.
  const pendingAppointments = createMemo(() =>
    (appointments()?.items ?? [])
      .filter((appointment) => appointment.status === "pending" && appointment.teacher?.id === user().id)
      .sort((a, b) => (a.starts_at ?? a.created_at) - (b.starts_at ?? b.created_at))
      .slice(0, 5),
  );

  // PAR-01 child-scoped panels. A parent may link several children; default
  // to the first and let them switch when there is more than one.
  const [selectedChildId, setSelectedChildId] = createSignal("");
  createEffect(() => {
    const first = children()?.items[0]?.id;
    if (first && !selectedChildId()) setSelectedChildId(first);
  });
  const [childClasses] = createResource(
    () => (role() === "parent" && selectedChildId() ? selectedChildId() : null),
    (id) => getClassesByUserId(id, { limit: 1 }).catch(() => null),
  );
  const homeroomTeacher = () => childClasses()?.items[0]?.teacher ?? null;
  const [childAttendance] = createResource(
    () => (role() === "parent" && selectedChildId() ? selectedChildId() : null),
    (id) => getUserAttendance(id).catch(() => null),
  );
  const childAttendanceBreakdown = createMemo(() => {
    const report = childAttendance();
    if (!report) return null;
    const sum = (k: "present" | "absent" | "late" | "excused") => report.events[k] + report.sessions[k];
    const total = report.events.total + report.sessions.total;
    return {
      present: sum("present"),
      absent: sum("absent"),
      late: sum("late"),
      excused: sum("excused"),
      rate: total ? Math.round((sum("present") / total) * 100) : null,
    };
  });
  const [childStatement] = createResource(
    () => (role() === "parent" && selectedChildId() ? selectedChildId() : null),
    (id) => getPaymentStatementByUserId(id, { limit: 100 }).catch(() => null),
  );
  const paymentSummary = createMemo(() => {
    const statement = childStatement();
    if (!statement) return null;
    const entries = statement.entries.items;
    const settled = (entry: (typeof entries)[number]) => !entry.reversed && entry.outstanding_minor <= 0;
    const next = entries
      .filter((entry) => !entry.reversed && entry.outstanding_minor > 0 && entry.due_at != null)
      .sort((a, b) => a.due_at! - b.due_at!)[0] ?? null;
    return {
      paidCount: entries.filter(settled).length,
      total: entries.length,
      next,
      balanceMinor: statement.balance_minor,
    };
  });

  // The ADM-01 hero (search + quick links to `/admin/users`) targets a route
  // guarded to `admin` only — a manager would 403 on it, so the hero stays
  // admin-exclusive and manager keeps the classic left-aligned header.
  const isAdminHome = () => role() === "admin";

  // ADM-01 quick-link columns. `/users/search` needs a query, so a plain
  // "recent students" list reads the first page of `/users` and filters to
  // the student role client-side rather than guessing a role query param.
  const [recentStudents] = createResource(
    () => (isAdminHome() ? true : null),
    () => getUsers({ limit: 30 }),
  );
  const [recentClasses] = createResource(
    () => (isAdminHome() ? true : null),
    () => getClasses({ limit: 2 }),
  );
  const studentQuickLinks = createMemo<QuickLinkRow[]>(() =>
    (recentStudents()?.items ?? [])
      .filter((candidate) => candidate.role === "student")
      .slice(0, 2)
      .map((candidate) => ({
        id: candidate.id,
        primary: [candidate.name, candidate.surname].filter(Boolean).join(" ") || candidate.username,
        secondary: candidate.username,
        Icon: IconUsers,
      })),
  );
  const classQuickLinks = createMemo<QuickLinkRow[]>(() =>
    (recentClasses()?.items ?? []).slice(0, 2).map((cls) => ({
      id: cls.id,
      primary: cls.name,
      secondary: cls.grade ?? undefined,
      Icon: IconBook,
    })),
  );

  // Hero search. `/users/search` is the only search endpoint the app has, so
  // this box only ever finds students — it never claims to search classes,
  // exams, or modules the way the Figma copy does.
  const [searchInput, setSearchInput] = createSignal("");
  const [searchQuery, setSearchQuery] = createSignal("");
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  const onSearchInput = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => setSearchQuery(value.trim()), 250);
  };
  onCleanup(() => clearTimeout(searchDebounce));
  const [searchResults] = createResource(
    () => (isAdminHome() && searchQuery() ? searchQuery() : null),
    (q) => getUserSearch(q, undefined, "student", { limit: 6 }),
  );

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;
  const now = () => clock()?.now ?? Date.now();

  // STU-01 "Bu Hafta" rail — this week's pomodoro focus minutes, Monday
  // through Sunday. Distinct granularity from the 26-week heatmap below;
  // both read the same already-fetched `pomodoro` resource.
  const weekdayFormatter = createMemo(() => new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { weekday: "short" }));
  const weeklyFocus = createMemo(() => {
    const sessions = pomodoro()?.items ?? [];
    const today = new Date(now());
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i).getTime();
      const dayEnd = dayStart + DAY_MS;
      const minutes = sessions
        .filter((session) => session.duration_ms != null && session.started_at >= dayStart && session.started_at < dayEnd)
        .reduce((sum, session) => sum + Math.round(session.duration_ms! / 60000), 0);
      return { id: String(i), label: weekdayFormatter().format(dayStart), minutes };
    });
  });
  const weeklyFocusTotal = createMemo(() => weeklyFocus().reduce((sum, day) => sum + day.minutes, 0));
  const weeklyFocusMax = createMemo(() => Math.max(1, ...weeklyFocus().map((day) => day.minutes)));

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
        { labelKey: "dashboard.stats.students", value: teacherStudentCount() == null ? "—" : String(teacherStudentCount()), Icon: IconUsers },
        { labelKey: "dashboard.stats.exams", value: String(exams()?.total ?? 0), Icon: IconExam },
        { labelKey: "dashboard.stats.homework", value: String(homework()?.total ?? 0), Icon: IconHomework },
      ];
    }
    if (r === "parent") {
      return [
        { labelKey: "dashboard.stats.children", value: String(children()?.total ?? 0), Icon: IconUsers },
        { labelKey: "dashboard.stats.appointments", value: String(appointments()?.total ?? 0), Icon: IconCalendarDays },
        { labelKey: "dashboard.stats.meals", value: String(menus()?.total ?? 0), Icon: IconUtensils },
        { labelKey: "dashboard.stats.childAttendance", value: childAttendanceBreakdown()?.rate == null ? "—" : `${childAttendanceBreakdown()!.rate}%`, Icon: IconClipboardCheck },
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
    // PAR-01's "Yaklaşan" also carries the next fee installment — real, from
    // the same statement the "Ödeme" rail card reads.
    if (role() === "parent") {
      for (const entry of childStatement()?.entries.items ?? []) {
        if (entry.reversed || entry.outstanding_minor <= 0) continue;
        const status = scheduleStatus(entry.due_at, entry.due_at, now());
        if (status) items.push({ id: entry.charge_id, kind: "payment", title: entry.plan_name ?? t("dashboard.type.payment"), at: entry.due_at!, status });
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
      case "payment":
        return navigate({ to: "/payments" });
    }
  };

  const error = createMemo(() => {
    const problem = courses.error || events.error || exams.error || homework.error || children.error || appointments.error || menus.error || marks.error || attendance.error || myClasses.error || pomodoro.error || childAttendance.error || childStatement.error;
    return problem ? formatApiError(problem, locale()) : "";
  });

  return (
    <div class="space-y-6">
        <Show
          when={isAdminHome()}
          fallback={
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
          }
        >
          <header class="flex flex-col items-center gap-4 pb-2 pt-2 text-center">
            <div class="flex items-center gap-2">
              <Badge variant="outline" class="bg-surface-overlay">{t(roleKeys[role()])}</Badge>
              <time class="text-sm tabular-nums text-text-subtle">
                {new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium" }).format(now())}
              </time>
            </div>
            <h1 class="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-text-strong">{t("dashboard.hero.heading")}</h1>
            <div class="relative w-full max-w-xl">
              <IconSearch class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
              <input
                type="search"
                value={searchInput()}
                onInput={(event) => onSearchInput(event.currentTarget.value)}
                placeholder={t("dashboard.hero.searchPlaceholder")}
                class="h-[46px] w-full rounded-lg border border-border-line bg-surface-base pl-11 pr-4 text-sm text-text-default shadow-sm placeholder:text-text-placeholder focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Show when={searchQuery() && searchResults()}>
                <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-10 rounded-lg border border-border-line bg-surface-base py-1 text-left shadow-md">
                  <Show
                    when={(searchResults()?.items.length ?? 0) > 0}
                    fallback={<p class="px-4 py-2 text-sm text-text-subtle">{t("dashboard.hero.searchEmpty")}</p>}
                  >
                    <For each={searchResults()?.items}>
                      {(person) => (
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-default hover:bg-surface-tint"
                          onClick={() => navigate({ to: "/admin/users/$id", params: { id: person.id } })}
                        >
                          <IconUsers class="h-4 w-4 shrink-0 text-text-subtle" />
                          <span class="min-w-0 flex-1 truncate">{person.display_name || person.username}</span>
                        </button>
                      )}
                    </For>
                  </Show>
                </div>
              </Show>
            </div>
            <div class="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <QuickLinkColumn
                title={t("dashboard.quicklinks.students")}
                rows={studentQuickLinks()}
                empty={t("dashboard.quicklinks.empty")}
                onOpen={(row) => navigate({ to: "/admin/users/$id", params: { id: row.id } })}
              />
              <QuickLinkColumn
                title={t("dashboard.quicklinks.classes")}
                rows={classQuickLinks()}
                empty={t("dashboard.quicklinks.empty")}
                onOpen={(row) => navigate({ to: "/management/classes/$id", params: { id: row.id } })}
              />
              <ComingSoonPanel class="text-left" title={t("dashboard.quicklinks.modules")} />
            </div>
          </header>
        </Show>

        <Suspense fallback={<PageSpinner />}>
          <Show when={error()}>
            <p class="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error()}</p>
          </Show>

          <section class="space-y-3" aria-labelledby="highlights-heading">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 id="highlights-heading" class="text-base font-semibold tracking-tight text-text-strong">{t("dashboard.analytics")}</h2>
              <Show when={isAdminHome()}>
                <div class="flex items-center gap-2">
                  <select disabled class="h-8 rounded-lg border border-border-line bg-surface-tint px-2 text-[13px] text-text-subtle disabled:opacity-60">
                    <option>{t("dashboard.admin.rangeThisMonth")}</option>
                  </select>
                  <ComingSoonBadge />
                </div>
              </Show>
            </div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <For each={stats()}>
                {(stat) => <StatTile label={t(stat.labelKey)} value={stat.value} Icon={stat.Icon} />}
              </For>
            </div>
          </section>

          <Show when={role() === "student"}>
            {/* STU-01's own "Bugünün Planı" and "Konu Yetkinliğim" main-column
                cards need a study-plan/mastery API this app doesn't have, and
                "Ses Atölyesi" has no backend concept at all — all three keep
                their design slot as a ComingSoonPanel. "Bu Hafta" is real
                (this week's pomodoro minutes), so it gets the rail slot the
                design reserves for that kind of card. */}
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
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
              </div>
              <div class="flex flex-col gap-2 rounded-xl border border-border-line bg-surface-base p-4 lg:col-span-1">
                <div class="flex items-center gap-2">
                  <IconClock class="h-4 w-4 shrink-0 text-text-subtle" />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-text-strong">{t("dashboard.student.thisWeek")}</p>
                    <p class="truncate text-xs text-text-subtle">{t("dashboard.student.thisWeekDesc")}</p>
                  </div>
                </div>
                <div class="flex h-16 items-end gap-1.5 pt-2">
                  <For each={weeklyFocus()}>
                    {(day) => (
                      <div class="flex flex-1 flex-col items-center gap-1">
                        <div
                          class="w-full rounded-sm bg-primary/70"
                          style={{ height: `${Math.max(4, Math.round((day.minutes / weeklyFocusMax()) * 100))}%` }}
                        />
                        <span class="text-[10px] text-text-subtle">{day.label}</span>
                      </div>
                    )}
                  </For>
                </div>
                <p class="mono text-xs tabular-nums text-text-subtle">{t("dashboard.student.thisWeekTotal", { minutes: String(weeklyFocusTotal()) })}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ComingSoonPanel title={t("dashboard.student.todayPlan")} />
              <ComingSoonPanel title={t("dashboard.student.mastery")} />
              <ComingSoonPanel title={t("dashboard.student.audioWorkshop")} />
            </div>
          </Show>

          <Show when={role() === "teacher"}>
            {/* TCH-01's "Bugünün Programı" needs a bulk sessions/timetable
                endpoint this app doesn't have, and "Sınıf Performansı" needs
                per-class topic mastery, which is out too — both keep their
                design slot as a ComingSoonPanel rather than disappearing. The
                AI suggestion queue has no backend at all. The one real rail
                item behind that queue — a pending appointment request —
                gets the rail. */}
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2">
                <ChartLine
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
              </div>
              <div class="flex flex-col rounded-xl border border-border-line bg-surface-base p-4">
                <div class="flex items-center gap-2 pb-3">
                  <IconCalendarDays class="h-4 w-4 shrink-0 text-text-subtle" />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-text-strong">{t("dashboard.teacher.pendingAppointments")}</p>
                    <p class="truncate text-xs text-text-subtle">{t("dashboard.teacher.pendingAppointmentsDesc")}</p>
                  </div>
                </div>
                <Show
                  when={pendingAppointments().length > 0}
                  fallback={<p class="py-3 text-sm text-text-subtle">{t("dashboard.teacher.pendingAppointmentsEmpty")}</p>}
                >
                  <For each={pendingAppointments()}>
                    {(appointment) => (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/appointments" })}
                        class="flex w-full flex-col gap-0.5 border-t border-border-hairline py-2.5 text-left first:border-t-0"
                      >
                        <span class="truncate text-sm font-medium text-text-default">{personLabel(appointment.requester)}</span>
                        <span class="truncate text-xs text-text-subtle">{appointment.reason || "—"}</span>
                        <span class="text-xs tabular-nums text-text-subtle">{appointment.starts_at ? formatDateTime(appointment.starts_at, locale()) : ""}</span>
                      </button>
                    )}
                  </For>
                </Show>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <ComingSoonPanel title={t("dashboard.teacher.schedule")} />
              <ComingSoonPanel title={t("dashboard.teacher.classPerformance")} />
            </div>
          </Show>

          <Show when={role() === "manager" || role() === "admin"}>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
            </div>
          </Show>

          <Show when={role() === "parent"}>
            {/* PAR-01's "Gelişim" (topic-mastery trend) needs mastery data this
                app doesn't have, and "Öğretmen Notları" has no backend concept
                distinct from `/messages` — both keep their design slot as a
                ComingSoonPanel. "Devamsızlık" and "Ödeme" are both real,
                per-child reads already used elsewhere in the app (`/students`
                child detail, `/payments`). */}
            <Show when={(children()?.items.length ?? 0) > 1}>
              <div class="flex items-center gap-2">
                <label for="dashboard-child" class="text-sm text-text-subtle">{t("dashboard.parent.child")}</label>
                <select
                  id="dashboard-child"
                  value={selectedChildId()}
                  onInput={(event) => setSelectedChildId(event.currentTarget.value)}
                  class="h-8 rounded-lg border border-border-line bg-surface-base px-2 text-[13px] text-text-default"
                >
                  <For each={children()?.items}>
                    {(child) => <option value={child.id}>{personLabel(child)}</option>}
                  </For>
                </select>
              </div>
            </Show>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div class="flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4 lg:col-span-2">
                <div>
                  <p class="text-sm font-semibold text-text-strong">{t("dashboard.parent.attendanceDetail")}</p>
                  <p class="text-xs text-text-subtle">{t("dashboard.parent.attendanceDetailDesc")}</p>
                  <Show when={homeroomTeacher()}>
                    {(teacher) => <p class="mt-1 text-xs text-text-subtle">{t("dashboard.parent.homeroom", { name: personLabel(teacher()) })}</p>}
                  </Show>
                </div>
                <Show when={childAttendanceBreakdown()} fallback={<p class="text-sm text-text-subtle">{t("dashboard.chartEmpty")}</p>}>
                  {(breakdown) => (
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.present")}</p>
                        <p class="mono text-lg font-semibold tabular-nums text-text-strong">{breakdown().present}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.absent")}</p>
                        <p class="mono text-lg font-semibold tabular-nums text-text-strong">{breakdown().absent}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.excused")}</p>
                        <p class="mono text-lg font-semibold tabular-nums text-text-strong">{breakdown().excused}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.parent.attendanceRate")}</p>
                        <p class="mono text-lg font-semibold tabular-nums text-text-strong">{breakdown().rate == null ? "—" : `${breakdown().rate}%`}</p>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
              <div class="flex flex-col gap-2 rounded-xl border border-border-line bg-surface-base p-4">
                <p class="text-sm font-semibold text-text-strong">{t("dashboard.parent.payment")}</p>
                <p class="text-xs text-text-subtle">{t("dashboard.parent.paymentDesc")}</p>
                <Show
                  when={(() => {
                    const summary = paymentSummary();
                    return summary && summary.total > 0 ? summary : null;
                  })()}
                  fallback={<p class="pt-2 text-sm text-text-subtle">{t("dashboard.parent.paymentEmpty")}</p>}
                >
                  {(summary) => (
                    <div class="flex flex-col gap-2 pt-1">
                      <p class="mono text-sm tabular-nums text-text-strong">
                        {t("dashboard.parent.installmentsPaid", { paid: String(summary().paidCount), total: String(summary().total) })}
                      </p>
                      <p class="text-xs text-text-subtle">{t("dashboard.parent.balance")}: <span class="mono tabular-nums text-text-default">{formatTry(summary().balanceMinor, locale() === "tr" ? "tr-TR" : "en-US")}</span></p>
                      <Show when={summary().next}>
                        {(next) => (
                          <p class="text-xs text-text-subtle">
                            {t("dashboard.parent.nextInstallment")}: {formatDateTime(next().due_at!, locale())} · <span class="mono tabular-nums text-text-default">{formatTry(next().amount_minor, locale() === "tr" ? "tr-TR" : "en-US")}</span>
                          </p>
                        )}
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
            </div>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ComingSoonPanel class="lg:col-span-2" title={t("dashboard.parent.progress")} />
              <ComingSoonPanel title={t("dashboard.parent.teacherNotes")} />
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
