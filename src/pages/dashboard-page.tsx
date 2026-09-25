import { For, Show, Suspense, createEffect, createMemo, createSignal, type Component } from "solid-js";
import { createBoardResources } from "@/lib/board-resources";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Role } from "@/api/client";
import { formatApiError, isModuleDisabledError } from "@/api/client";
import { getAppointments } from "@/api/appointments";
import { getClasses, getClassesByUserId, getClassMembers, getMyClasses } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getInstanceEnrollments, getMyInstances } from "@/api/instances";
import { getEvents } from "@/api/events";
import { getExams, getExamStatistics } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getMealMenus } from "@/api/meals";
import { getMyStudents } from "@/api/parents";
import { getPaymentStatementByUserId } from "@/api/payments";
import { getPomodoroMe } from "@/api/pomodoro";
import { getMyAttendance, getMyMarks, getUserAttendance } from "@/api/reports";
import { getTime } from "@/api/time/getTime";
import { getUsers } from "@/api/users";
import { RouteGuard } from "@/components/layout/route-guard";
import { Button } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-inline";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartBar } from "@/components/ui/chart-bar";
import { ChartHeatmap, type HeatmapEntry } from "@/components/ui/chart-heatmap";
import { ChartLine } from "@/components/ui/chart-line";
import { ChartProgressRing } from "@/components/ui/chart-progress-ring";
import { DataTable } from "@/components/ui/data-table";
import { CommandSearchField } from "@/components/dashboard/command-search-field";
import { QuickLinkColumn, type QuickLinkRow } from "@/components/dashboard/quick-link-column";
import { ChildHomeworkPanel } from "@/components/dashboard/child-homework-panel";
import { HomeworkQueuePanel } from "@/components/dashboard/homework-queue-panel";
import { SetupChecklistPanel } from "@/components/dashboard/setup-checklist-panel";
import { TodayLessonsPanel } from "@/components/dashboard/today-lessons-panel";
import { StatTile } from "@/components/dashboard/stat-tile";
import {
  IconBook,
  IconCalendarDays,
  IconChart,
  IconClipboardCheck,
  IconClock,
  IconExam,
  IconHomework,
  IconUsers,
  IconUtensils,
  IconPackage,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { createInstanceLabels, loadInstanceLabels } from "@/lib/instance-labels";
import { uuidV7Ms } from "@/lib/uuid-time";
import { formatTry } from "@/lib/meals";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { packageLabel } from "@/lib/module-labels";
import { hasMinRole } from "@/lib/roles";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { getModulesCatalog } from "@/api/modules";
import { useModules } from "@/stores/modules-context";
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
/** Classes whose roster size the admin "Şubeler" quick links read. */
const CLASS_LINK_CAP = 12;

/**
 * Chronological key for an exam: its schedule when it has one, else when it
 * was created (the id is a UUIDv7). Used only to order points, never shown.
 */
function examOrder(exam: { id: string; starts_at: number | null }): number {
  return exam.starts_at ?? uuidV7Ms(exam.id) ?? 0;
}

type Status = "active" | "today" | "soon";
type DeadlineKind = "exam" | "event" | "appointment" | "homework" | "payment";

type DeadlineRow = {
  id: string;
  kind: DeadlineKind;
  title: string;
  at: number;
  status: Status;
  /** The şube×ders an exam or homework belongs to. */
  instance?: string;
  /** Its "<ders> — <şube>" label, once read. */
  section?: string;
};

type StatCardData = {
  labelKey: MessageKey;
  /** The module the number comes from; the tile is left out when it is off. */
  module?: string;
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

/**
 * One panel's placeholder while its own reads are in flight: each board
 * section has its own Suspense, so a slow source holds back only its panel
 * instead of the whole page behind one spinner.
 */
function PanelSkeleton() {
  return (
    <div class="animate-pulse space-y-3 rounded-xl border border-border-line bg-surface-base p-4" aria-hidden="true">
      <div class="h-4 w-40 rounded bg-surface-tint" />
      <div class="h-24 rounded-lg bg-surface-tint" />
    </div>
  );
}

function DashboardContent() {
  // Every panel reads its own source; one failed request must not take the
  // others down with it (see createBoardResources).
  const board = createBoardResources();
  const createResource = board.createResource;
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const user = () => auth.user()!;
  const role = () => user().role;
  // A school can have any module switched off, and every route of an off
  // module answers 403. The board never asks one (the source goes null), and
  // a refusal that races a builder's switch reads as "no data" instead of
  // throwing through the page — it used to blank the whole homepage.
  const schoolModules = useModules();
  const on = (module: string) => !schoolModules.loading() && schoolModules.isEnabled(module);
  const quiet = <T,>(request: Promise<T>): Promise<T | null> =>
    request.catch((err: unknown) => {
      if (isModuleDisabledError(err)) return null;
      throw err;
    });
  const [clock] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  // Unpaged: the backend has no `kind` filter, so a "courses" count that
  // excludes studies and clubs has to be counted here over the whole list.
  const [courses] = createResource(
    () => role() === "parent" || !on("courses") ? null : role(),
    () => quiet(getCourses()),
  );
  const courseTitleOf = (courseId: string) => courses()?.items.find((course) => course.id === courseId)?.title ?? "…";
  const courseCount = () => (courses.error ? "—" : String((courses()?.items ?? []).filter((course) => course.kind === "course").length));
  // `/events` has no role gate — a parent-teacher conference is a real PAR-01
  // "Yaklaşan" item, so parent reads this too (unlike `exams`/`homework`
  // below, which really are course-scoped and out of a parent's reach).
  const [events] = createResource(
    () => (on("events") ? clock()?.now : null),
    (now) => quiet(getEvents({ ends_after: now, limit: 50 })),
  );
  const [exams] = createResource(
    () => role() === "parent" || !on("exams") ? null : role(),
    () => quiet(getExams({ limit: 100 })),
  );
  // Unfiltered: `/homework` has no due-date window, so this one read serves both
  // the deadlines table (filtered by `scheduleStatus`) and the backwards-looking
  // heatmap.
  // `limit: 100` matches the shell's feed read, so the two coalesce.
  const [homework] = createResource(
    () => role() === "parent" || !on("homework") ? null : role(),
    () => quiet(getHomework({ limit: 100 })),
  );
  const [children] = createResource(
    () => role() === "parent" ? true : null,
    () => quiet(getMyStudents({ limit: 12 })),
  );
  // Same page as the shell's notification poll (`limit: 100`), so the two
  // concurrent first-paint reads coalesce into one request in `client`.
  const [appointments] = createResource(
    () => (on("appointments") ? true : null),
    () => quiet(getAppointments({ limit: 100 })),
  );
  const [menus] = createResource(
    () => (on("meals") ? clock()?.now : null),
    (now) => quiet(getMealMenus({ from: new Date(now).toISOString().slice(0, 10), limit: 1 })),
  );
  const [marks] = createResource(
    () => role() === "student" && on("marks") ? true : null,
    () => quiet(getMyMarks()),
  );
  const [attendance] = createResource(
    () => role() === "student" && on("attendance") ? true : null,
    () => quiet(getMyAttendance()),
  );
  const [myClasses] = createResource(
    () => role() === "student" && on("classes") ? true : null,
    () => quiet(getMyClasses({ limit: 1 })),
  );
  // Focus heatmap source. Only a student owns pomodoro sessions — reading
  // another user's log is the teacher+ /management/pomodoros page's job.
  const [pomodoro] = createResource(
    () => role() === "student" && on("pomodoro") ? true : null,
    () => quiet(getPomodoroMe({ limit: 400 })),
  );
  // `/events` is the one list here that really is filtered server-side, by the
  // `ends_after` window the deadlines table needs. The heatmap looks backwards
  // and there is no "before" filter, so past events need their own read.
  const [pastEvents] = createResource(
    () => hasMinRole(role(), "teacher") && on("events") ? true : null,
    () => getEvents({ limit: 100 }).catch(() => null),
  );
  // Success trend source for teacher+. Exam statistics are grader-only, so this
  // never runs for a student or parent — they would get a 403.
  const [examStats] = createResource(
    () => hasMinRole(role(), "teacher") ? exams.latest?.items ?? null : null,
    async (items) => {
      // An exam with no schedule (an untimed, paper or imported one) still
      // gets graded — skipping unscheduled exams left the charts empty while
      // real marks existed. Only a scheduled exam still in the future is out.
      const recent = items
        .filter((exam) => !exam.draft && (exam.starts_at == null || exam.starts_at <= now()))
        .sort((a, b) => examOrder(b) - examOrder(a))
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
        .sort((a, b) => examOrder(a.exam) - examOrder(b.exam));
    },
  );
  // Exams name an instance (şube × ders). The trend labels "<ders> — <şube>"
  // and the course bars group by the catalog course behind it; `/instances/me`
  // is empty for the office, so each charted instance is read by id (bounded
  // by TREND_EXAM_CAP, cached for the tab).
  const [trendSections] = createResource(
    () => examStats.latest ?? null,
    (rows) => loadInstanceLabels(rows.map((row) => row.exam.class_course), role()),
  );
  const myClass = () => myClasses.latest?.items[0] ?? null;

  // TCH-01 "Öğrencim" stat — Course carries no enrolled-count field, so this
  // reads each of the teacher's own courses' enrollment page and unions the
  // user ids. Bounded to a handful of courses, the same cost shape as the
  // admin quick-link class-member lookups.
  const [teacherStudentCount] = createResource(
    () => (role() === "teacher" ? true : null),
    async () => {
      // Rosters hang off the instance now, so the count walks the teacher's
      // own sections instead of the catalog rows they own.
      const items = (await getMyInstances({ limit: 200 })).items;
      const settled = await Promise.all(
        items.slice(0, 20).map((instance) => getInstanceEnrollments(instance.id, { limit: 200 }).catch(() => null)),
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
    () => (role() === "parent" && on("classes") && selectedChildId() ? selectedChildId() : null),
    (id) => getClassesByUserId(id, { limit: 1 }).catch(() => null),
  );
  const homeroomTeacher = () => childClasses()?.items[0]?.teacher ?? null;
  const [childAttendance] = createResource(
    () => (role() === "parent" && on("attendance") && selectedChildId() ? selectedChildId() : null),
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
    () => (role() === "parent" && on("payments") && selectedChildId() ? selectedChildId() : null),
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
  // "Şubeler" quick links: the classes with the most students, each labelled
  // with its roster size. A class carries no member count, so each one costs
  // a `limit=1` roster read for its `total` — capped at CLASS_LINK_CAP classes
  // (taken in name order) so a large school does not fan out on the homepage.
  const [recentClasses] = createResource(
    () => (isAdminHome() && on("classes") ? true : null),
    async () => {
      const page = await quiet(getClasses({ limit: 200 }));
      if (!page) return null;
      const candidates = [...page.items]
        .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }))
        .slice(0, CLASS_LINK_CAP);
      const counted = await mapConcurrent(candidates, FAN_OUT_LIMIT, async (cls) => ({
        cls,
        students: await getClassMembers(cls.id, { limit: 1 }).then((members) => members.total, () => null),
      }));
      return counted
        .sort((a, b) => (b.students ?? -1) - (a.students ?? -1) || a.cls.name.localeCompare(b.cls.name, "tr", { numeric: true }))
        .slice(0, 2);
    },
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
    (recentClasses() ?? []).map((row) => ({
      id: row.cls.id,
      primary: row.cls.name,
      secondary: row.students == null ? undefined : t("classGroups.studentsCount", { count: row.students }),
      Icon: IconBook,
    })),
  );

  // The school's own entitlements per package: the catalog is deploy-constant,
  // the enabled set is already in the shell's modules context.
  const [moduleCatalog] = createResource(
    () => (isAdminHome() ? true : null),
    () => getModulesCatalog().catch(() => null),
  );
  const moduleQuickLinks = createMemo<QuickLinkRow[]>(() => {
    const catalog = moduleCatalog();
    const enabled = schoolModules.enabled();
    if (!catalog || !enabled) return [];
    return catalog.packages.map((pkg) => {
      const on = pkg.modules.filter((module) => enabled.includes(module));
      return {
        id: pkg.package,
        primary: packageLabel(pkg.package, t),
        secondary: `${on.length}/${pkg.modules.length}`,
        Icon: IconPackage,
      };
    });
  });

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

  /** A stat over a list total; a source that failed shows "—", never a made-up 0. */
  const countOf = (source: { (): { total: number } | null | undefined; error: unknown }) =>
    source.error ? "—" : String(source()?.total ?? 0);
  const allStats = createMemo<StatCardData[]>(() => {
    const r = role();
    if (r === "student") {
      return [
        { labelKey: "dashboard.stats.courses", module: "courses", value: courseCount(), Icon: IconBook },
        { labelKey: "dashboard.stats.exams", module: "exams", value: countOf(exams), Icon: IconExam },
        { labelKey: "dashboard.stats.average", module: "marks", value: formatDecimal(marks()?.overall_average, locale()), Icon: IconChart },
        { labelKey: "dashboard.stats.attendance", module: "attendance", value: attendanceRate() == null ? "—" : `${attendanceRate()}%`, Icon: IconClipboardCheck },
      ];
    }
    if (r === "teacher") {
      return [
        { labelKey: "dashboard.stats.courses", module: "courses", value: courseCount(), Icon: IconBook },
        { labelKey: "dashboard.stats.students", module: "courses", value: teacherStudentCount() == null ? "—" : String(teacherStudentCount()), Icon: IconUsers },
        { labelKey: "dashboard.stats.exams", module: "exams", value: countOf(exams), Icon: IconExam },
        { labelKey: "dashboard.stats.homework", module: "homework", value: countOf(homework), Icon: IconHomework },
      ];
    }
    if (r === "parent") {
      return [
        { labelKey: "dashboard.stats.children", value: countOf(children), Icon: IconUsers },
        { labelKey: "dashboard.stats.appointments", module: "appointments", value: countOf(appointments), Icon: IconCalendarDays },
        { labelKey: "dashboard.stats.meals", module: "meals", value: countOf(menus), Icon: IconUtensils },
        { labelKey: "dashboard.stats.childAttendance", module: "attendance", value: childAttendanceBreakdown()?.rate == null ? "—" : `${childAttendanceBreakdown()!.rate}%`, Icon: IconClipboardCheck },
      ];
    }
    return [
      { labelKey: "dashboard.stats.courses", module: "courses", value: courseCount(), Icon: IconBook },
      { labelKey: "dashboard.stats.exams", module: "exams", value: countOf(exams), Icon: IconExam },
      { labelKey: "dashboard.stats.events", module: "events", value: countOf(events), Icon: IconCalendarDays },
      { labelKey: "dashboard.stats.meals", module: "meals", value: countOf(menus), Icon: IconUtensils },
    ];
  });
  const stats = () => allStats().filter((stat) => !stat.module || on(stat.module));

  // Student trend — own marks ordered by their exam's date. Marks whose exam
  // falls outside the fetched exam page carry no date and are left out rather
  // than guessed into the sequence.
  const myMarkTrend = createMemo(() => {
    const report = marks();
    if (!report) return [];
    // A mark's exam may have no schedule; it still belongs on the line,
    // ordered by when the exam was created, just without a date caption.
    const examDates = new Map((exams()?.items ?? []).map((exam) => [exam.id, exam.starts_at]));
    return report.courses
      .flatMap((course) =>
        course.results.map((result) => {
          const at = examDates.get(result.exam) ?? null;
          return {
            id: `${course.course.id}:${result.exam}`,
            label: `${course.course.title}: ${result.title}`,
            value: result.mark,
            at,
            order: examOrder({ id: result.exam, starts_at: at }),
          };
        }),
      )
      .sort((a, b) => a.order - b.order)
      .slice(-TREND_MARK_CAP)
      .map((row) => ({
        id: row.id,
        label: row.label,
        value: row.value,
        formattedValue: formatDecimal(row.value, locale()),
        caption: row.at == null ? undefined : formatTrendDate(row.at),
      }));
  });

  const sectionOf = (instanceId: string) => trendSections.latest?.get(instanceId) ?? null;

  // Teacher+ trend — the backend's own per-exam average, oldest exam first.
  const examAverageTrend = createMemo(() =>
    (examStats() ?? []).map((row) => {
      const section = sectionOf(row.exam.class_course);
      return {
        id: row.exam.id,
        label: section ? `${section.label}: ${row.exam.title}` : row.exam.title,
        value: row.stats!.average!,
        formattedValue: formatDecimal(row.stats!.average!, locale()),
        caption: row.exam.starts_at == null ? undefined : formatTrendDate(row.exam.starts_at),
      };
    }),
  );

  // Teacher+ comparison — the same exam averages grouped by course, so a weak
  // subject stands out rather than being averaged into one school-wide number.
  // An exam whose section could not be read has no course to go under and is
  // left out of the bars rather than filed under a raw id.
  const courseAverageBars = createMemo(() => {
    const buckets = new Map<string, { label: string; averages: number[] }>();
    for (const row of examStats() ?? []) {
      const section = sectionOf(row.exam.class_course);
      if (!section?.courseTitle) continue;
      const bucket = buckets.get(section.course) ?? { label: section.courseTitle, averages: [] };
      bucket.averages.push(row.stats!.average!);
      buckets.set(section.course, bucket);
    }
    return [...buckets.entries()]
      .map(([courseId, bucket]) => {
        const mean = bucket.averages.reduce((sum, value) => sum + value, 0) / bucket.averages.length;
        return {
          id: courseId,
          label: bucket.label,
          value: mean,
          formattedValue: formatDecimal(mean, locale()),
        };
      })
      .sort((a, b) => b.value - a.value);
  });

  // Student progress panel — per-course averages from the marks report.
  const courseAverages = createMemo(() =>
    (marks()?.courses ?? [])
      .filter((c) => c.average != null)
      .map((c) => ({ id: c.course.id, label: c.course.title, value: c.average!, formattedValue: formatDecimal(c.average!, locale()) })),
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

  const rawDeadlines = createMemo<DeadlineRow[]>(() => {
    const items: DeadlineRow[] = [];
    for (const exam of exams()?.items ?? []) {
      const status = scheduleStatus(exam.starts_at, exam.ends_at, now());
      if (status) items.push({ id: exam.id, kind: "exam", title: exam.title, at: exam.starts_at!, status, instance: exam.class_course });
    }
    for (const event of events()?.items ?? []) {
      const status = scheduleStatus(event.starts_at, event.ends_at, now());
      if (status) items.push({ id: event.id, kind: "event", title: event.title, at: event.starts_at!, status });
    }
    for (const hw of homework()?.items ?? []) {
      const status = scheduleStatus(hw.due_at, hw.due_at, now());
      if (status) items.push({ id: hw.id, kind: "homework", title: hw.title, at: hw.due_at, status, instance: hw.class_course });
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
  // One ders taught in two şubeler gives two rows with the same title, so a
  // row names "<ders> — <şube>" under its title.
  // The label is folded into the row (a new array) rather than read in the
  // cell: the table caches cells by data identity and would not repaint.
  const deadlineSections = createInstanceLabels(
    () => rawDeadlines().flatMap((row) => (row.instance ? [row.instance] : [])),
    role,
  );
  const deadlines = createMemo<DeadlineRow[]>(() => {
    const labels = deadlineSections();
    return rawDeadlines().map((row) => (row.instance && labels[row.instance] ? { ...row, section: labels[row.instance].label } : row));
  });
  const deadlineSection = (row: DeadlineRow) => row.section;

  const headerClass = "text-xs font-medium text-muted-foreground";
  const deadlineColumns = createMemo<ColumnDef<DeadlineRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("dashboard.col.task"),
      enableSorting: false,
      meta: { headerClass },
      cell: (info) => (
        <div class="min-w-0">
          <span class="block truncate font-medium">{info.row.original.title}</span>
          <Show when={deadlineSection(info.row.original)}>
            {(section) => <span class="block truncate text-xs text-text-subtle">{section()}</span>}
          </Show>
        </div>
      ),
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
          <Badge variant="outline" class="rounded-full text-[11px]">
            <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", s === "active" ? "bg-emerald-500" : s === "today" ? "bg-amber-500" : "bg-muted-foreground/50")} />
            {s === "active" ? t("dashboard.activeNow") : s === "today" ? t("dashboard.today") : t("dashboard.soon")}
          </Badge>
        );
      },
    },
  ]);

  const deadlineSearch = (row: DeadlineRow, q: string) => matchesSearch(q, row.title, deadlineSection(row));
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
    return problem && !isModuleDisabledError(problem) ? formatApiError(problem, locale()) : "";
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
              <CommandSearchField class="max-w-md" />
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
            <CommandSearchField />
            <div class={cn("grid w-full grid-cols-1 gap-3", on("classes") ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <QuickLinkColumn
                title={t("dashboard.quicklinks.students")}
                illustration="people"
                rows={studentQuickLinks()}
                empty={t("dashboard.quicklinks.empty")}
                onOpen={(row) => navigate({ to: "/admin/users/$id", params: { id: row.id } })}
              />
              <Show when={on("classes")}>
                <QuickLinkColumn
                  title={t("dashboard.quicklinks.classes")}
                  illustration="courses"
                  rows={classQuickLinks()}
                  empty={t("dashboard.quicklinks.empty")}
                  onOpen={(row) => navigate({ to: "/management/classes/$id", params: { id: row.id } })}
                />
              </Show>
              <QuickLinkColumn
                title={t("dashboard.quicklinks.modules")}
                illustration="modules"
                rows={moduleQuickLinks()}
                empty={t("dashboard.quicklinks.empty")}
                onOpen={() => navigate({ to: "/management/modules" })}
              />
            </div>
          </header>
        </Show>

        <Suspense fallback={<PageSpinner />}>
          <Show when={error()}>
            <div role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive-text">
              <span class="min-w-0 flex-1">{t("dashboard.partialError")} {error()}</span>
              <Button type="button" size="sm" variant="outline" class="shrink-0 border-destructive/40" onClick={() => board.retryFailed()}>
                {t("common.tryAgain")}
              </Button>
            </div>
          </Show>

          {/* ADM setup: what a new school still needs, ticked by real counts;
              it disappears once every step is done. Its own Suspense so the
              board never waits on it. */}
          <Show when={isAdminHome() && !schoolModules.loading()}>
            <Suspense>
              <SetupChecklistPanel moduleOn={on} />
            </Suspense>
          </Show>

          <Suspense fallback={<PanelSkeleton />}>
          <section class="space-y-3" aria-labelledby="highlights-heading">
            <h2 id="highlights-heading" class="text-base font-semibold tracking-tight text-text-strong">{t("dashboard.analytics")}</h2>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <For each={stats()}>
                {(stat) => <StatTile label={t(stat.labelKey)} value={stat.value} Icon={stat.Icon} />}
              </For>
            </div>
          </section>
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <Show when={role() === "student"}>
            {/* STU-01's "Konu Yetkinliğim" and "Ses Atölyesi" cards need a
                mastery / audio backend this app doesn't have, so they are left
                out rather than shown as placeholders. "Bu Hafta" is real
                (this week's pomodoro minutes), so it gets the rail slot the
                design reserves for that kind of card. */}
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-3">
                <Show when={on("marks")}>
                  <ChartBar
                    title={t("dashboard.progressOverview")}
                    subtitle={t("dashboard.courseAverages")}
                    items={courseAverages()}
                    maxScale={100}
                    itemsPerPage={5}
                  />
                  <ChartLine
                    class="sm:order-first sm:col-span-2"
                    title={t("dashboard.successTrend")}
                    subtitle={t("dashboard.successTrendMine")}
                    items={myMarkTrend()}
                    maxScale={100}
                  />
                </Show>
                <Show when={on("attendance")}>
                  <ChartProgressRing
                    title={t("dashboard.activitySplit")}
                    subtitle={t("dashboard.activitySplitDesc")}
                    segments={attendanceSegments()}
                    itemsPerPage={3}
                  />
                </Show>
              </div>
              <Show when={on("pomodoro")}>
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
                        <span class="text-[11px] text-text-subtle">{day.label}</span>
                      </div>
                    )}
                  </For>
                </div>
                <p class="text-xs tabular-nums text-text-subtle">{t("dashboard.student.thisWeekTotal", { minutes: String(weeklyFocusTotal()) })}</p>
              </div>
              </Show>
            </div>
            <Show when={on("sessions") && clock()}>
              {(ready) => <TodayLessonsPanel audience="student" now={ready().now} courseTitle={courseTitleOf} />}
            </Show>
          </Show>
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <Show when={role() === "teacher"}>
            {/* TCH-01's "Bugünün Programı" is built from real reads: the
                teacher's sections, each one's sessions filtered to today, and
                each started lesson's roll-call count — it leads the board
                because an untaken roll call is the one thing that cannot wait.
                "Sınıf Performansı" needs per-class topic mastery, which is
                out, so it is left off the board. The AI suggestion
                queue has no backend at all. The one real rail item behind that
                queue — a pending appointment request — gets the rail. */}
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Show when={on("sessions") && clock()}>
                {(ready) => <TodayLessonsPanel now={ready().now} courseTitle={courseTitleOf} />}
              </Show>
              <Show when={on("homework") && clock()}>
                {(ready) => <HomeworkQueuePanel homework={homework()?.items ?? []} teacherId={user().id} now={ready().now} />}
              </Show>
            </div>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Show when={on("exams")}>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2">
                <ChartLine
                  class="sm:col-span-2"
                  title={t("dashboard.successTrend")}
                  subtitle={t("dashboard.successTrendSchool")}
                  items={examAverageTrend()}
                  maxScale={100}
                />
                <ChartBar
                  class="sm:col-span-2"
                  title={t("dashboard.courseAverages")}
                  subtitle={t("dashboard.courseAveragesSchool")}
                  items={courseAverageBars()}
                  maxScale={100}
                  itemsPerPage={5}
                />
              </div>
              </Show>
              <Show when={on("appointments")}>
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
                  fallback={<EmptyInline illustration="calendar-empty" title={t("dashboard.teacher.pendingAppointmentsEmpty")} />}
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
              </Show>
            </div>
          </Show>
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <Show when={(role() === "manager" || role() === "admin") && on("exams")}>
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
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <Show when={role() === "parent"}>
            {/* PAR-01's "Gelişim" (topic-mastery trend) needs mastery data this
                app doesn't have, and "Öğretmen Notları" has no backend concept
                distinct from `/messages` — both are left off the board.
                "Devamsızlık" and "Ödeme" are both real,
                per-child reads already used elsewhere in the app (`/students`
                child detail, `/payments`). */}
            <Show when={(children()?.items.length ?? 0) > 1}>
              <div class="flex items-center gap-2">
                <label for="dashboard-child" class="text-sm text-text-subtle">{t("dashboard.parent.child")}</label>
                <Select
                  id="dashboard-child"
                  wrapperClass="w-auto"
                  class="h-8"
                  value={selectedChildId()}
                  onChange={(event) => setSelectedChildId(event.currentTarget.value)}
                >
                  <For each={children()?.items}>
                    {(child) => <option value={child.id}>{personLabel(child)}</option>}
                  </For>
                </Select>
              </div>
            </Show>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Show when={on("attendance")}>
              <div class="flex flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-4 lg:col-span-2">
                <div>
                  <p class="text-sm font-semibold text-text-strong">{t("dashboard.parent.attendanceDetail")}</p>
                  <p class="text-xs text-text-subtle">{t("dashboard.parent.attendanceDetailDesc")}</p>
                  <Show when={homeroomTeacher()}>
                    {(teacher) => <p class="mt-1 text-xs text-text-subtle">{t("dashboard.parent.homeroom", { name: personLabel(teacher()) })}</p>}
                  </Show>
                </div>
                <Show when={childAttendanceBreakdown()} fallback={<EmptyInline illustration="charts" title={t("dashboard.chartEmpty")} hint={t("dashboard.chartEmptyHint")} />}>
                  {(breakdown) => (
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.present")}</p>
                        <p class="text-lg font-semibold tabular-nums text-text-strong">{breakdown().present}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.absent")}</p>
                        <p class="text-lg font-semibold tabular-nums text-text-strong">{breakdown().absent}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.attend.excused")}</p>
                        <p class="text-lg font-semibold tabular-nums text-text-strong">{breakdown().excused}</p>
                      </div>
                      <div class="rounded-lg bg-surface-tint px-3 py-2">
                        <p class="text-xs text-text-subtle">{t("dashboard.parent.attendanceRate")}</p>
                        <p class="text-lg font-semibold tabular-nums text-text-strong">{breakdown().rate == null ? "—" : `${breakdown().rate}%`}</p>
                      </div>
                    </div>
                  )}
                </Show>
              </div>
              </Show>
              <Show when={on("payments")}>
              <div class="flex flex-col gap-2 rounded-xl border border-border-line bg-surface-base p-4">
                <p class="text-sm font-semibold text-text-strong">{t("dashboard.parent.payment")}</p>
                <p class="text-xs text-text-subtle">{t("dashboard.parent.paymentDesc")}</p>
                <Show
                  when={(() => {
                    const summary = paymentSummary();
                    return summary && summary.total > 0 ? summary : null;
                  })()}
                  fallback={<EmptyInline illustration="payments" title={t("dashboard.parent.paymentEmpty")} />}
                >
                  {(summary) => (
                    <div class="flex flex-col gap-2 pt-1">
                      <p class="text-sm tabular-nums text-text-strong">
                        {t("dashboard.parent.installmentsPaid", { paid: String(summary().paidCount), total: String(summary().total) })}
                      </p>
                      <p class="text-xs text-text-subtle">{t("dashboard.parent.balance")}: <span class="tabular-nums text-text-default">{formatTry(summary().balanceMinor, locale() === "tr" ? "tr-TR" : "en-US")}</span></p>
                      <Show when={summary().next}>
                        {(next) => (
                          <p class="text-xs text-text-subtle">
                            {t("dashboard.parent.nextInstallment")}: {formatDateTime(next().due_at!, locale())} · <span class="tabular-nums text-text-default">{formatTry(next().amount_minor, locale() === "tr" ? "tr-TR" : "en-US")}</span>
                          </p>
                        )}
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
              </Show>
            </div>
            {/* PAR progress: the child's homework report (a parent-readable
                route) as overdue / due-this-week; marks-based progress still
                has no parent-facing trend. */}
            <Show when={on("homework") && selectedChildId() && clock()}>
              <ChildHomeworkPanel childId={selectedChildId()} now={clock()!.now} />
            </Show>
          </Show>
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <section class="flex flex-col gap-4 rounded-xl border border-border-line bg-surface-base p-4" aria-labelledby="deadlines-heading">
            <h2 id="deadlines-heading" class="text-base font-semibold tracking-tight">{t("dashboard.deadlines")}</h2>
            <DataTable
              columns={deadlineColumns()}
              data={deadlines()}
              enableColumnVisibility={false}
              searchPredicate={deadlines().length > 0 ? deadlineSearch : undefined}
              filterHint={t("search.hint.deadlines")}
              empty={t("dashboard.upcomingEmpty")}
              emptyIllustration="calendar-empty"
              onRowClick={openDeadline}
            />
          </section>
          </Suspense>

          <Suspense fallback={<PanelSkeleton />}>
          <Show when={!heatmapIsFocus() || on("pomodoro")}>
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
          </Show>
          </Suspense>
        </Suspense>
    </div>
  );
}
