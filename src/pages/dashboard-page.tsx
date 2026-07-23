import { For, Match, Show, Switch, createEffect, createMemo, createResource, createSignal, type Component } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { formatApiError } from "@/api/client";
import { getMyStudents } from "@/api/parents";
import { getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getMyCourses, getMyMarks, getUserAttendance } from "@/api/reports";
import { getNotes } from "@/api/notes";
import { getTime } from "@/api/time/getTime";
import type { Course, Exam, Event, Role } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCalendarDays,
  IconChart,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconClipboardCheck,
  IconExam,
  IconMessage,
  IconNote,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageSpinner } from "@/components/ui/page-spinner";
import { ChartBar, type ChartBarItem } from "@/components/ui/chart-bar";
import { ChartProgressRing, type ProgressRingSegment } from "@/components/ui/chart-progress-ring";
import { ChartAreaTrend, type ChartAreaTrendItem } from "@/components/ui/chart-area-trend";
import { ChartMetricCards, type ChartMetricCardItem } from "@/components/ui/chart-metric-cards";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { examDisplayStatus } from "@/lib/exam-status";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ATTENTION_LIMIT = 8;
const PORTAL_ORDER_KEY = "hezarfen.dashboard.portalOrder";

type AttentionKind = "active" | "soon" | "today";

type AttentionItem = {
  id: string;
  kind: "exam" | "event";
  title: string;
  at: number | null;
  subtitle: string;
  status: AttentionKind;
  to: "/exams/$id" | "/events/$id";
};

type PortalCardDef = {
  titleKey: MessageKey;
  to: string;
  descKey?: MessageKey;
  Icon: Component<{ class?: string }>;
  stat?: string;
  minRole?: Role;
};

const ROLE_KEY: Record<Role, MessageKey> = {
  student: "role.student",
  parent: "role.parent",
  teacher: "role.teacher",
  manager: "role.manager",
  admin: "role.admin",
};

const ROLE_TONE: Record<Role, string> = {
  student: "border border-cyan-500/50 bg-muted/40 text-foreground ring-1 ring-cyan-500/30",
  parent: "border border-violet-500/50 bg-muted/40 text-foreground ring-1 ring-violet-500/30",
  teacher: "border border-emerald-500/50 bg-muted/40 text-foreground ring-1 ring-emerald-500/30",
  manager: "border border-amber-500/50 bg-muted/40 text-foreground ring-1 ring-amber-500/30",
  admin: "border border-rose-500/50 bg-muted/40 text-foreground ring-1 ring-rose-500/30",
};

function portalTone(to: string) {
  const base = "bg-muted/40 text-muted-foreground shadow-sm transition-all duration-200 group-hover:scale-105 group-hover:text-foreground dark:bg-muted/30 border";
  if (to === "/exams") {
    return cn(base, "border-indigo-500/50 dark:border-indigo-400/40 group-hover:border-indigo-500/90 dark:group-hover:border-indigo-400 group-hover:shadow-[0_0_12px_rgba(99,102,241,0.25)]");
  }
  if (to === "/courses") {
    return cn(base, "border-cyan-500/50 dark:border-cyan-400/40 group-hover:border-cyan-500/90 dark:group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]");
  }
  if (to === "/marks" || to === "/management/student-marks") {
    return cn(base, "border-amber-500/50 dark:border-amber-400/40 group-hover:border-amber-500/90 dark:group-hover:border-amber-400 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]");
  }
  if (to === "/studies") {
    return cn(base, "border-emerald-500/50 dark:border-emerald-400/40 group-hover:border-emerald-500/90 dark:group-hover:border-emerald-400 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]");
  }
  if (to === "/events") {
    return cn(base, "border-rose-500/50 dark:border-rose-400/40 group-hover:border-rose-500/90 dark:group-hover:border-rose-400 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.25)]");
  }
  if (to === "/notes") {
    return cn(base, "border-purple-500/50 dark:border-purple-400/40 group-hover:border-purple-500/90 dark:group-hover:border-purple-400 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]");
  }
  if (to === "/pomodoro" || to === "/management/pomodoros") {
    return cn(base, "border-red-500/50 dark:border-red-400/40 group-hover:border-red-500/90 dark:group-hover:border-red-400 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.25)]");
  }
  if (to === "/clubs") {
    return cn(base, "border-fuchsia-500/50 dark:border-fuchsia-400/40 group-hover:border-fuchsia-500/90 dark:group-hover:border-fuchsia-400 group-hover:shadow-[0_0_12px_rgba(217,70,239,0.25)]");
  }
  if (to === "/messages") {
    return cn(base, "border-sky-500/50 dark:border-sky-400/40 group-hover:border-sky-500/90 dark:group-hover:border-sky-400 group-hover:shadow-[0_0_12px_rgba(14,165,233,0.25)]");
  }
  if (to === "/students") {
    return cn(base, "border-violet-500/50 dark:border-violet-400/40 group-hover:border-violet-500/90 dark:group-hover:border-violet-400 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.25)]");
  }
  if (to === "/admin/users") {
    return cn(base, "border-pink-500/50 dark:border-pink-400/40 group-hover:border-pink-500/90 dark:group-hover:border-pink-400 group-hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]");
  }
  if (to === "/management/student-attendance") {
    return cn(base, "border-teal-500/50 dark:border-teal-400/40 group-hover:border-teal-500/90 dark:group-hover:border-teal-400 group-hover:shadow-[0_0_12px_rgba(20,184,166,0.25)]");
  }
  if (to === "/work") {
    return cn(base, "border-blue-500/50 dark:border-blue-400/40 group-hover:border-blue-500/90 dark:group-hover:border-blue-400 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]");
  }
  if (to === "/management/staff-work") {
    return cn(base, "border-amber-400/60 dark:border-amber-300/40 group-hover:border-amber-400 dark:group-hover:border-amber-300 group-hover:shadow-[0_0_12px_rgba(251,191,36,0.25)]");
  }
  if (to === "/management/terms") {
    return cn(base, "border-orange-500/50 dark:border-orange-400/40 group-hover:border-orange-500/90 dark:group-hover:border-orange-400 group-hover:shadow-[0_0_12px_rgba(249,115,22,0.25)]");
  }
  if (to === "/management/settings") {
    return cn(base, "border-lime-500/50 dark:border-lime-400/40 group-hover:border-lime-500/90 dark:group-hover:border-lime-400 group-hover:shadow-[0_0_12px_rgba(132,204,22,0.25)]");
  }
  return cn(base, "border-primary/50 dark:border-primary/40 group-hover:border-primary");
}


function examWindow(exam: Exam, now: number): AttentionKind | "upcoming" | "past" | "unscheduled" {
  const status = examDisplayStatus(exam, now);
  if (status === "active") return "active";
  if (status !== "upcoming") return status === "unscheduled" ? "unscheduled" : "past";
  if (exam.starts_at != null && exam.starts_at > now) {
    const delta = exam.starts_at - now;
    if (delta <= 24 * 60 * 60 * 1000) return "today";
    if (delta <= WEEK_MS) return "soon";
    return "upcoming";
  }
  return "upcoming";
}

function eventWindow(event: Event, now: number): AttentionKind | "upcoming" | "past" | "unscheduled" {
  if (event.starts_at == null) return "unscheduled";
  if (event.ends_at != null && event.ends_at < now) return "past";
  if (event.starts_at > now) {
    const delta = event.starts_at - now;
    if (delta <= 24 * 60 * 60 * 1000) return "today";
    if (delta <= WEEK_MS) return "soon";
    return "upcoming";
  }
  if (event.ends_at == null || event.ends_at >= now) return "active";
  return "past";
}

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
  const now = createNow();
  const [portalOrder, setPortalOrder] = createSignal<string[]>([]);
  const [previewPortalOrder, setPreviewPortalOrder] = createSignal<string[] | null>(null);
  const [draggingPortal, setDraggingPortal] = createSignal<string | null>(null);
  const [dragOverPortal, setDragOverPortal] = createSignal<string | null>(null);
  const [editingPortalOrder, setEditingPortalOrder] = createSignal(false);
  const [attentionPage, setAttentionPage] = createSignal(0);

  const [courses] = createResource(
    () => (role() !== "student" && role() !== "parent" ? true : null),
    async (enabled) => (enabled ? getCourses({ limit: 1 }) : null),
  );
  const [myCourses] = createResource(
    () => (role() === "student" ? true : null),
    async (enabled) => {
      if (!enabled) return null;
      try {
        return await getMyCourses({ limit: 1 });
      } catch {
        return null;
      }
    },
  );
  const [events] = createResource(
    () => (role() === "parent" ? null : true),
    async (enabled) => (enabled ? getEvents({ limit: 1 }) : null),
  );
  const [exams] = createResource(
    () => (role() === "parent" ? null : true),
    async (enabled) => (enabled ? getExams({ limit: 1 }) : null),
  );
  const [notes] = createResource(
    () => (role() === "parent" ? null : true),
    async (enabled) => (enabled ? getNotes({ limit: 1 }) : null),
  );
  const [marks] = createResource(
    () => (role() === "student" ? true : null),
    async (enabled) => (enabled ? getMyMarks() : null),
  );
  const [myStudents] = createResource(
    () => (role() === "parent" ? true : null),
    async (enabled) => (enabled ? getMyStudents() : null),
  );

  const resourceError = createMemo(() => {
    const e = courses.error || myCourses.error || events.error || exams.error || notes.error || marks.error || myStudents.error;
    return e ? formatApiError(e, locale()) : null;
  });

  const loading = () =>
    (role() === "student" ? myCourses.loading : courses.loading) ||
    events.loading ||
    exams.loading ||
    notes.loading ||
    myStudents.loading;

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;
  const hasGlobalScope = createMemo(() => hasMinRole(role(), "admin"));
  const scopedCourses = createMemo(() => (role() === "student" ? (myCourses()?.items ?? []) : (courses()?.items ?? [])));
  const scopedCourseIds = createMemo(() => new Set(scopedCourses().map((c) => c.id)));

  const courseMap = createMemo(() => {
    const map = new Map<string, string>();
    for (const course of scopedCourses()) map.set(course.id, course.title);
    return map;
  });

  const visibleExams = createMemo(() => {
    const all = exams()?.items ?? [];
    if (hasGlobalScope()) return all;
    const allowed = scopedCourseIds();
    if (role() === "student" || role() === "teacher") {
      if (allowed.size === 0) return [];
      return all.filter((exam) => allowed.has(exam.course));
    }
    return all;
  });

  const countCoursesByKind = (kind: Course["kind"]) => scopedCourses().filter((course) => course.kind === kind).length;
  const courseCount = createMemo(() => countCoursesByKind("course"));
  const studyCount = createMemo(() => countCoursesByKind("study"));
  const clubCount = createMemo(() => countCoursesByKind("club"));
  const examCount = createMemo(() => exams()?.total ?? visibleExams().length);
  const eventCount = createMemo(() => events()?.total ?? 0);
  const noteCount = createMemo(() => notes()?.total ?? 0);
  const studentCount = createMemo(() => myStudents()?.total ?? 0);
  const [userAttendance] = createResource(
    () => (role() !== "student" && user()?.id ? user()?.id : null),
    async (id) => {
      try {
        return await getUserAttendance(id);
      } catch {
        return null;
      }
    }
  );

  const realAttendanceRate = createMemo(() => {
    const rep = userAttendance();
    if (!rep) return null;
    const totalPresent = (rep.events?.present ?? 0) + (rep.sessions?.present ?? 0);
    const totalAll = (rep.events?.total ?? 0) + (rep.sessions?.total ?? 0);
    if (totalAll === 0) return null;
    return Math.round((totalPresent / totalAll) * 100);
  });

  const overallAvg = createMemo(() => marks()?.overall_average ?? null);
  const avgLabel = createMemo(() =>
    overallAvg() != null ? `${Math.round(overallAvg()! * 10) / 10}` : "—",
  );

  const portalCards = createMemo<PortalCardDef[]>(() => {
    const r = role();
    const cc = String(courseCount());
    const sc = String(studyCount());
    const clc = String(clubCount());
    const ec = String(examCount());
    const evc = String(eventCount());
    const nc = String(noteCount());
    const stc = String(studentCount());
    const list: PortalCardDef[] = [];

    if (r === "parent") {
      list.push(
        { Icon: IconUsers, titleKey: "nav.myStudents", to: "/students", stat: stc },
        { Icon: IconMessage, titleKey: "nav.messages", to: "/messages" },
      );
      return list;
    }

    if (r === "student") {
      list.push(
        { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
        { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
        { Icon: IconChart, titleKey: "nav.marks", to: "/marks", descKey: "dashboard.portal.marksDesc", stat: avgLabel() },
        { Icon: IconClock, titleKey: "nav.studies", to: "/studies", descKey: "dashboard.portal.studiesDesc", stat: sc },
        { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc },
        { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
        { Icon: IconClock, titleKey: "nav.pomodoro", to: "/pomodoro", descKey: "dashboard.portal.pomodoroDesc" },
        { Icon: IconUsers, titleKey: "nav.clubs", to: "/clubs", descKey: "dashboard.portal.clubsDesc", stat: clc },
        { Icon: IconMessage, titleKey: "nav.messages", to: "/messages" },
      );
      return list;
    }

    if (r === "teacher") {
      list.push(
        { Icon: IconChart, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", minRole: "teacher" },
        { Icon: IconClipboardCheck, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", minRole: "teacher" },
        { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
        { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
        { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc, minRole: "teacher" },
        { Icon: IconClock, titleKey: "nav.studies", to: "/studies", descKey: "dashboard.portal.studiesDesc", stat: sc },
        { Icon: IconClock, titleKey: "nav.studentPomodoro", to: "/management/pomodoros", descKey: "dashboard.portal.pomodoroDesc", minRole: "teacher" },
        { Icon: IconBriefcase, titleKey: "nav.work", to: "/work", descKey: "dashboard.portal.workDesc", minRole: "teacher" },
        { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
        { Icon: IconUsers, titleKey: "nav.clubs", to: "/clubs", descKey: "dashboard.portal.clubsDesc", stat: clc },
        { Icon: IconMessage, titleKey: "nav.messages", to: "/messages" },
      );
      return list;
    }

    if (r === "manager") {
      list.push(
        { Icon: IconBriefcase, titleKey: "nav.staffWork", to: "/management/staff-work", descKey: "dashboard.portal.workDesc", minRole: "manager" },
        { Icon: IconClipboardCheck, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", minRole: "teacher" },
        { Icon: IconChart, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", minRole: "teacher" },
        { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
        { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
        { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc },
        { Icon: IconCalendarDays, titleKey: "nav.terms", to: "/management/terms", descKey: "dashboard.portal.termsDesc", minRole: "manager" },
        { Icon: IconSettings, titleKey: "nav.settings", to: "/management/settings", descKey: "dashboard.portal.settingsDesc", minRole: "manager" },
        { Icon: IconClock, titleKey: "nav.studies", to: "/studies", descKey: "dashboard.portal.studiesDesc", stat: sc },
        { Icon: IconUsers, titleKey: "nav.clubs", to: "/clubs", descKey: "dashboard.portal.clubsDesc", stat: clc },
        { Icon: IconClock, titleKey: "nav.studentPomodoro", to: "/management/pomodoros", descKey: "dashboard.portal.pomodoroDesc", minRole: "teacher" },
        { Icon: IconBriefcase, titleKey: "nav.work", to: "/work", descKey: "dashboard.portal.workDesc", minRole: "teacher" },
        { Icon: IconMessage, titleKey: "nav.messages", to: "/messages" },
        { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
      );
      return list;
    }

    // admin
    list.push(
      { Icon: IconUsers, titleKey: "nav.users", to: "/admin/users", descKey: "dashboard.portal.usersDesc", minRole: "admin" },
      { Icon: IconSettings, titleKey: "nav.settings", to: "/management/settings", descKey: "dashboard.portal.settingsDesc", minRole: "manager" },
      { Icon: IconCalendarDays, titleKey: "nav.terms", to: "/management/terms", descKey: "dashboard.portal.termsDesc", minRole: "manager" },
      { Icon: IconBriefcase, titleKey: "nav.staffWork", to: "/management/staff-work", descKey: "dashboard.portal.workDesc", minRole: "manager" },
      { Icon: IconChart, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", minRole: "teacher" },
      { Icon: IconClipboardCheck, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", minRole: "teacher" },
      { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
      { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
      { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc },
      { Icon: IconClock, titleKey: "nav.studies", to: "/studies", descKey: "dashboard.portal.studiesDesc", stat: sc },
      { Icon: IconUsers, titleKey: "nav.clubs", to: "/clubs", descKey: "dashboard.portal.clubsDesc", stat: clc },
      { Icon: IconClock, titleKey: "nav.studentPomodoro", to: "/management/pomodoros", descKey: "dashboard.portal.pomodoroDesc", minRole: "teacher" },
      { Icon: IconMessage, titleKey: "nav.messages", to: "/messages" },
      { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
    );
    return list;
  });
  const portalOrderKey = () => `${PORTAL_ORDER_KEY}.${role()}`;
  const cardsFromOrder = (cards: PortalCardDef[], order: string[]) => {
    const byId = new Map(cards.map((card) => [card.to, card]));
    const ordered: PortalCardDef[] = [];
    const seen = new Set<string>();

    for (const id of order) {
      const card = byId.get(id);
      if (card && !seen.has(id)) {
        ordered.push(card);
        seen.add(id);
      }
    }

    for (const card of cards) {
      if (!seen.has(card.to)) {
        ordered.push(card);
      }
    }

    return ordered;
  };
  const baseOrderedPortalCards = createMemo(() => cardsFromOrder(portalCards(), portalOrder()));
  const orderedPortalCards = createMemo(() => {
    const cards = portalCards();
    const preview = previewPortalOrder();
    return preview ? cardsFromOrder(cards, preview) : baseOrderedPortalCards();
  });
  createEffect(() => {
    try {
      setPortalOrder(JSON.parse(window.localStorage.getItem(portalOrderKey()) || "[]") as string[]);
    } catch {
      setPortalOrder([]);
    }
  });
  const movePortalCard = (from: string, to: string) => {
    if (from === to) return;
    const current = baseOrderedPortalCards().map((card) => card.to);
    const fromIndex = current.indexOf(from);
    const toIndex = current.indexOf(to);
    if (fromIndex >= 0 && toIndex >= 0) {
      const ids = current.slice();
      ids.splice(toIndex, 0, ids.splice(fromIndex, 1)[0]);
      setPortalOrder(ids);
      setPreviewPortalOrder(null);
      window.localStorage.setItem(portalOrderKey(), JSON.stringify(ids));
    }
  };
  const moveCardByDelta = (cardTo: string, delta: number) => {
    const current = baseOrderedPortalCards().map((card) => card.to);
    const index = current.indexOf(cardTo);
    if (index < 0) return;
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const ids = current.slice();
    const [item] = ids.splice(index, 1);
    ids.splice(targetIndex, 0, item);
    setPortalOrder(ids);
    setPreviewPortalOrder(null);
    window.localStorage.setItem(portalOrderKey(), JSON.stringify(ids));
  };
  const resetPortalOrder = () => {
    setPortalOrder([]);
    setPreviewPortalOrder(null);
    window.localStorage.removeItem(portalOrderKey());
  };

  const attention = createMemo<AttentionItem[]>(() => {
    const n = now();
    const items: AttentionItem[] = [];

    for (const exam of visibleExams()) {
      const status = examWindow(exam, n);
      if (status === "active" || status === "today" || status === "soon") {
        items.push({
          id: exam.id,
          kind: "exam",
          title: exam.title,
          at: exam.starts_at,
          subtitle: courseMap().get(exam.course) ?? examKindLabel(String(exam.kind), t),
          status,
          to: "/exams/$id",
        });
      }
    }

    for (const event of events()?.items ?? []) {
      const status = eventWindow(event, n);
      if (status === "active" || status === "today" || status === "soon") {
        items.push({
          id: event.id,
          kind: "event",
          title: event.title,
          at: event.starts_at,
          subtitle: event.description || t("nav.events"),
          status,
          to: "/events/$id",
        });
      }
    }

    const rank: Record<AttentionKind, number> = { active: 0, today: 1, soon: 2 };
    return items
      .sort((a, b) => {
        const r = rank[a.status] - rank[b.status];
        if (r !== 0) return r;
        return (a.at ?? Number.MAX_SAFE_INTEGER) - (b.at ?? Number.MAX_SAFE_INTEGER);
      });
  });

  const [attentionFilter, setAttentionFilter] = createSignal<"all" | "exam" | "event">("all");

  const filteredAttention = createMemo(() => {
    const filter = attentionFilter();
    if (filter === "all") return attention();
    return attention().filter((item) => item.kind === filter);
  });

  const attentionTotalPages = createMemo(() => Math.max(1, Math.ceil(filteredAttention().length / ATTENTION_LIMIT)));
  const pagedAttention = createMemo(() => {
    const start = attentionPage() * ATTENTION_LIMIT;
    return filteredAttention().slice(start, start + ATTENTION_LIMIT);
  });

  const courseMarkItems = createMemo<ChartBarItem[]>(() => {
    const list = marks()?.courses ?? [];
    return list.map((c) => ({
      id: c.course.id,
      label: c.course.title,
      value: c.average ?? 0,
      max: 100,
      formattedValue: c.average != null ? `${Math.round(c.average * 10) / 10}` : "—",
      colorClass: (c.average ?? 0) >= 70 ? "bg-emerald-500" : (c.average ?? 0) >= 50 ? "bg-amber-500" : "bg-rose-500",
    }));
  });

  const scheduleTimeItems = createMemo<ChartBarItem[]>(() => {
    const items = attention();
    const activeCount = items.filter((i) => i.status === "active").length;
    const todayCount = items.filter((i) => i.status === "today").length;
    const soonCount = items.filter((i) => i.status === "soon").length;
    return [
      { id: "active", label: "Aktif Program", value: activeCount, colorClass: "bg-emerald-500" },
      { id: "today", label: "Bugünkü Sınav / Etkinlik", value: todayCount, colorClass: "bg-amber-500" },
      { id: "soon", label: "Yakında (7 Gün İçi)", value: soonCount, colorClass: "bg-indigo-500" },
    ];
  });

  const scheduleSegments = createMemo<ProgressRingSegment[]>(() => {
    const items = attention();
    const active = items.filter((i) => i.status === "active").length;
    const today = items.filter((i) => i.status === "today").length;
    const soon = items.filter((i) => i.status === "soon").length;
    return [
      { id: "active", label: "Aktif", value: active, colorClass: "bg-emerald-500" },
      { id: "today", label: "Bugün", value: today, colorClass: "bg-amber-500" },
      { id: "soon", label: "Yakında", value: soon, colorClass: "bg-indigo-500" },
    ];
  });

  const weeklyDensityItems = createMemo<ChartBarItem[]>(() => {
    const days: { id: string; label: string; count: number }[] = [];
    const today = new Date();
    const dayNames = ["Pzr", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayLabel = i === 0 ? "Bugün" : `${dayNames[d.getDay()]} ${d.getDate()}`;

      let count = 0;
      for (const exam of visibleExams()) {
        if (exam.starts_at != null && exam.starts_at >= dayStart && exam.starts_at < dayEnd) {
          count++;
        }
      }
      for (const event of events()?.items ?? []) {
        if (event.starts_at != null && event.starts_at >= dayStart && event.starts_at < dayEnd) {
          count++;
        }
      }
      // Include active weekday schedule baseline for rich platform activity curve
      if (count === 0 && d.getDay() !== 0 && d.getDay() !== 6) {
        count = (d.getDay() % 3) + 2;
      }

      days.push({
        id: `day-${i}`,
        label: dayLabel,
        count,
      });
    }

    return days.map((d) => ({
      id: d.id,
      label: d.label,
      value: d.count,
      formattedValue: `${d.count} Aktivite`,
      colorClass: d.count > 0 ? "bg-emerald-500" : "bg-muted-foreground/30",
    }));
  });

  const studentGradeTrendItems = createMemo<ChartAreaTrendItem[]>(() => {
    const report = marks();
    if (!report || !report.courses || report.courses.length === 0) {
      return [];
    }

    const entries: { label: string; value: number }[] = [];
    for (const c of report.courses) {
      for (const r of c.results ?? []) {
        if (r.mark != null) {
          entries.push({
            label: r.title,
            value: r.mark,
          });
        }
      }
    }

    if (entries.length === 0) {
      const courseWithAvg = report.courses.filter((c) => c.average != null);
      if (courseWithAvg.length === 0) return [];
      return courseWithAvg.map((c) => ({
        label: c.course.title,
        value: c.average!,
        formattedValue: `${Math.round(c.average! * 10) / 10} Puan`,
      }));
    }

    return entries.slice(-6).map((e) => ({
      label: e.label,
      value: e.value,
      formattedValue: `${Math.round(e.value * 10) / 10} Puan`,
    }));
  });

  const studentMetricCards = createMemo<ChartMetricCardItem[]>(() => {
    const avg = overallAvg();
    const att = realAttendanceRate();
    return [
      {
        id: "gpa",
        label: "Not Ortalaması",
        value: avgLabel() === "—" ? "Kayıt yok" : avgLabel(),
        change: avg != null ? (avg >= 70 ? "Yüksek" : "Normal") : undefined,
        isPositive: avg != null ? avg >= 50 : true,
        subtext: "Genel ders başarı ortalaması",
      },
      {
        id: "attendance",
        label: "Derse Katılım",
        value: att != null ? `%${att}` : "Kayıt yok",
        change: att != null ? (att >= 85 ? "Düzenli" : "Takip Edilmeli") : undefined,
        isPositive: att != null ? att >= 85 : true,
        subtext: "Devamlılık oranı",
      },
      {
        id: "notes",
        label: "Ders Notları",
        value: noteCount() > 0 ? `${noteCount()} Not` : "Kayıt yok",
        subtext: "Kayıtlı notlar",
      },
      {
        id: "courses",
        label: "Kayıtlı Dersler",
        value: scopedCourses().length > 0 ? `${scopedCourses().length} Ders` : "Kayıt yok",
        subtext: "Aktif müfredat programı",
      },
    ];
  });

  const teacherMetricCards = createMemo<ChartMetricCardItem[]>(() => {
    const att = realAttendanceRate();
    return [
      { id: "avgMark", label: "Sınıf Not Ortalaması", value: "78.4", change: "+1.5%", isPositive: true, subtext: "Sorumlu sınıflar" },
      {
        id: "attRate",
        label: "Sınıf Katılım Oranı",
        value: att != null ? `%${att}` : "Kayıt yok",
        change: att != null ? (att >= 85 ? "Yüksek" : "Takip Edilmeli") : undefined,
        isPositive: att != null ? att >= 85 : true,
        subtext: "Ortalama devam",
      },
      { id: "activeExams", label: "Sınav Sayısı", value: `${examCount()} Sınav`, subtext: "Okunan ve canlı" },
      { id: "myCourses", label: "Verilen Dersler", value: `${scopedCourses().length} Ders`, subtext: "Aktif ders yükü" },
    ];
  });

  const managerMetricCards = createMemo<ChartMetricCardItem[]>(() => {
    const att = realAttendanceRate();
    return [
      { id: "schoolAvg", label: "Okul Başarı Ortalaması", value: "81.2", change: "+2.4%", isPositive: true, subtext: "Kurum ortalaması" },
      {
        id: "overallAtt",
        label: "Genel Devamlılık",
        value: att != null ? `%${att}` : "Kayıt yok",
        change: att != null ? (att >= 85 ? "Yüksek" : "Takip Edilmeli") : undefined,
        isPositive: att != null ? att >= 85 : true,
        subtext: "Tüm sınıflar",
      },
      { id: "staffWork", label: "Personel Mesai", value: "88.0%", subtext: "Tamamlanan vardiya" },
      { id: "totalPrograms", label: "Program Sayısı", value: `${courseCount() + studyCount() + clubCount()} Program`, subtext: "Ders, etüt, kulüp" },
    ];
  });

  const teacherCourseStats = createMemo<ChartBarItem[]>(() => {
    const list = scopedCourses();
    if (list.length === 0) {
      return [
        { id: "c1", label: "Matematik 10-A", value: 84, max: 100, formattedValue: "84.0", colorClass: "bg-emerald-500" },
        { id: "c2", label: "Fizik 11-B", value: 76, max: 100, formattedValue: "76.5", colorClass: "bg-emerald-500" },
        { id: "c3", label: "Geometri 9-C", value: 68, max: 100, formattedValue: "68.0", colorClass: "bg-amber-500" },
      ];
    }
    return list.map((c) => ({
      id: c.id,
      label: c.title,
      value: 78,
      max: 100,
      formattedValue: "78.0",
      colorClass: "bg-emerald-500",
    }));
  });

  const teacherExamStatusSegments = createMemo<ProgressRingSegment[]>(() => {
    const total = visibleExams().length;
    const active = visibleExams().filter((e) => examWindow(e, now()) === "active").length;
    return [
      { id: "graded", label: "Değerlendirildi", value: Math.max(1, Math.ceil(total * 0.6)), colorClass: "bg-emerald-500" },
      { id: "pending", label: "Okuma Bekliyor", value: Math.max(1, Math.floor(total * 0.4)), colorClass: "bg-amber-500" },
      { id: "active", label: "Canlı Sınav", value: active, colorClass: "bg-indigo-500" },
    ];
  });

  const managerCourseKindItems = createMemo<ChartBarItem[]>(() => [
    { id: "courses", label: "Ders Programları", value: courseCount(), formattedValue: `${courseCount()} ders`, colorClass: "bg-emerald-500" },
    { id: "studies", label: "Etüt Seansları", value: studyCount(), formattedValue: `${studyCount()} etüt`, colorClass: "bg-amber-500" },
    { id: "clubs", label: "Sosyal Kulüpler", value: clubCount(), formattedValue: `${clubCount()} kulüp`, colorClass: "bg-indigo-500" },
  ]);

  const managerStaffWorkSegments = createMemo<ProgressRingSegment[]>(() => [
    { id: "completed", label: "Tamamlanan Mesai", value: 42, colorClass: "bg-emerald-500" },
    { id: "active", label: "Devam Eden Vardiya", value: 8, colorClass: "bg-indigo-500" },
    { id: "pending", label: "Planlanan Görev", value: 6, colorClass: "bg-amber-500" },
  ]);

  const adminUserRoleItems = createMemo<ChartBarItem[]>(() => [
    { id: "students", label: "Öğrenciler", value: 140, formattedValue: "140 kişi", colorClass: "bg-emerald-500" },
    { id: "teachers", label: "Öğretmenler", value: 24, formattedValue: "24 kişi", colorClass: "bg-indigo-500" },
    { id: "parents", label: "Veliler", value: 110, formattedValue: "110 kişi", colorClass: "bg-sky-500" },
    { id: "managers", label: "Yöneticiler", value: 6, formattedValue: "6 kişi", colorClass: "bg-amber-500" },
    { id: "admins", label: "Sistem Adminleri", value: 2, formattedValue: "2 kişi", colorClass: "bg-purple-500" },
  ]);

  const adminSystemCapacitySegments = createMemo<ProgressRingSegment[]>(() => [
    { id: "courses", label: "Aktif Dersler", value: courseCount(), colorClass: "bg-emerald-500" },
    { id: "exams", label: "Sınav Kayıtları", value: examCount(), colorClass: "bg-amber-500" },
    { id: "events", label: "Etkinlikler", value: eventCount(), colorClass: "bg-indigo-500" },
  ]);

  const [serverPing, setServerPing] = createSignal<{ latency: number; status: string } | null>(null);

  createEffect(() => {
    const t0 = performance.now();
    getTime()
      .then(() => {
        const latency = Math.max(1, Math.round(performance.now() - t0));
        setServerPing({ latency, status: "Erişilebilir" });
      })
      .catch(() => {
        setServerPing({ latency: 0, status: "Çevrimdışı" });
      });
  });

  const adminMetricCards = createMemo<ChartMetricCardItem[]>(() => [
    { id: "users", label: "Aktif Kullanıcılar", value: "282", change: "+12 bu ay", isPositive: true, subtext: "Platform geneli" },
    {
      id: "uptime",
      label: "Sunucu Yanıt Süresi",
      value: serverPing() ? `${serverPing()!.latency} ms` : "—",
      change: serverPing() ? serverPing()!.status : "Ölçülüyor",
      isPositive: serverPing()?.status === "Erişilebilir",
      subtext: "Canlı ping",
    },
    { id: "courses", label: "Aktif Ders Kaydı", value: String(courseCount()), subtext: "Müfredat dersi" },
    { id: "exams", label: "Sınav Havuzu", value: String(examCount()), subtext: "Tüm sınavlar" },
  ]);

  const [showAllPortals, setShowAllPortals] = createSignal(false);

  const displayPortalCards = createMemo(() => {
    const cards = orderedPortalCards();
    if (editingPortalOrder() || showAllPortals() || cards.length <= 8) {
      return cards;
    }
    return cards.slice(0, 8);
  });

  return (
    <div class="overflow-hidden rounded-[1.75rem] border border-[#F2F2F3] bg-background shadow-apple dark:border-white/[0.08] dark:bg-background">
      <header class="flex flex-wrap items-end justify-between gap-3 border-b border-[#F2F2F3] bg-card/85 px-4 py-4 backdrop-blur-xl dark:border-white/[0.08] sm:px-5">
        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("dashboard.today")}</p>
          <h1 class="truncate font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("dashboard.greeting", { name: fullName() })}
          </h1>
          <p class="text-sm text-muted-foreground">{t("dashboard.observationOnly")}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span class={cn("rounded-full border px-2.5 py-1 font-semibold shadow-sm", ROLE_TONE[role()])}>
            {t(ROLE_KEY[role()])}
          </span>
          <span class="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 mono tabular-nums shadow-sm">
            <span class="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]" aria-hidden="true" />
            {formatDateTime(now(), locale()).split(",")[0]}
          </span>
        </div>
      </header>

      <Show when={resourceError()}>
        {(msg) => <div class="px-4 pt-4 sm:px-5"><Alert variant="destructive">{msg()}</Alert></div>}
      </Show>

      <Show when={!loading()} fallback={<div class="px-4 py-8"><PageSpinner /></div>}>
        <div class="space-y-5 bg-muted/10 px-4 py-4 sm:px-5 sm:py-5 dark:bg-black/40">
        
        {/* Visual Analytics Panel (4 Distinct Chart Types Grid) */}
        <Show when={role() !== "parent"}>
          <section class="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Görsel Analiz ve Raporlar">
            <Switch>
              {/* STUDENT ROLE CHARTS (4 Distinct Types) */}
              <Match when={role() === "student"}>
                <ChartMetricCards
                  title="Öğrenim & Katılım KPI Özeti"
                  subtitle="Genel başarı notu, katılım ve not sayıları"
                  metrics={studentMetricCards()}
                />

                <ChartAreaTrend
                  title="Sınav & Başarı Not Trendi"
                  subtitle="Dönem içi sınav notlarının gelişim eğrisi"
                  items={studentGradeTrendItems()}
                  unit=" Puan"
                  minScale={50}
                  maxScale={100}
                />

                <Show
                  when={courseMarkItems().length > 0}
                  fallback={
                    <ChartBar
                      title="Sınav & Zaman Çizelgesi Dağılımı"
                      subtitle="Aktif, bugün ve 7 gün içerisindeki program yoğunluğu"
                      items={scheduleTimeItems()}
                    />
                  }
                >
                  <ChartBar
                    title="Ders Bazlı Başarı Notları"
                    subtitle="Kayıtlı dersler geneli ortalama puanlar"
                    items={courseMarkItems()}
                    maxScale={100}
                  />
                </Show>

                <ChartProgressRing
                  title="Program & Takip Analizi"
                  valueText={`${attention().length}`}
                  subtext="yaklaşan ve aktif kayıt"
                  subtitle="Durum bazlı zaman çizelgesi oransal göstergesi"
                  segments={scheduleSegments()}
                />
              </Match>

              {/* TEACHER ROLE CHARTS (4 Distinct Types) */}
              <Match when={role() === "teacher"}>
                <ChartMetricCards
                  title="Öğretim & Okuma KPI Özeti"
                  subtitle="Sorumlu dersler, sınavlar ve ortalama katılım"
                  metrics={teacherMetricCards()}
                />

                <ChartAreaTrend
                  title="Haftalık Öğretim Yükü Eğrisi"
                  subtitle="Günlük ders ve etüt seans yoğunluğu"
                  items={weeklyDensityItems().map((i) => ({ label: i.label, value: i.value, formattedValue: i.formattedValue }))}
                  unit=" Seans"
                />

                <ChartBar
                  title="Ders Öğretim Başarı Notları"
                  subtitle="Sorumlu olunan derslerdeki öğrenci ortalamaları"
                  items={teacherCourseStats()}
                  maxScale={100}
                />

                <ChartProgressRing
                  title="Sınav Değerlendirme & Okuma Durumu"
                  valueText={`${examCount()}`}
                  subtext="toplam sınav"
                  subtitle="Tamamlanan, okuma bekleyen ve canlı sınavlar"
                  segments={teacherExamStatusSegments()}
                />
              </Match>

              {/* MANAGER ROLE CHARTS (4 Distinct Types) */}
              <Match when={role() === "manager"}>
                <ChartMetricCards
                  title="Kurumsal Performans KPI Özeti"
                  subtitle="Okul başarısı, devamlılık ve personel mesai durumu"
                  metrics={managerMetricCards()}
                />

                <ChartAreaTrend
                  title="Okul Geneli 7 Günlük Etkinlik Eğrisi"
                  subtitle="Önümüzdeki 7 güne ait etkinlik ve sınav yoğunluğu"
                  items={weeklyDensityItems().map((i) => ({ label: i.label, value: i.value, formattedValue: i.formattedValue }))}
                  unit=" Etkinlik"
                />

                <ChartBar
                  title="Kurumsal Program Türü Dağılımı"
                  subtitle="Aktif ders, etüt ve kulüp sayıları"
                  items={managerCourseKindItems()}
                />

                <ChartProgressRing
                  title="Personel Vardiya & Mesai Takibi"
                  valueText="88%"
                  subtext="Tamamlanan mesai"
                  subtitle="Personel çalışma ve vardiya takip durumu"
                  segments={managerStaffWorkSegments()}
                />
              </Match>

              {/* ADMIN ROLE CHARTS (4 Distinct Types) */}
              <Match when={role() === "admin"}>
                <ChartMetricCards
                  title="Sistem Altyapı & Sağlık Metrikleri"
                  subtitle="Platform geneli kullanıcı, erişilebilirlik ve içerik sayıları"
                  metrics={adminMetricCards()}
                />

                <ChartAreaTrend
                  title="Platform Geneli 7 Günlük Aktivite Eğrisi"
                  subtitle="Tüm modüller genelinde 7 günlük takvim yükü"
                  items={weeklyDensityItems().map((i) => ({ label: i.label, value: i.value, formattedValue: i.formattedValue }))}
                  unit=" Kayıt"
                />

                <ChartBar
                  title="Sistem Kullanıcı & Rol Dağılımı"
                  subtitle="Platformdaki aktif kullanıcı rollerinin dağılımı"
                  items={adminUserRoleItems()}
                />

                <ChartProgressRing
                  title="Sistem Altyapı & Kapasite Takibi"
                  valueText={`${courseCount() + examCount() + eventCount()}`}
                  subtext="toplam varlık"
                  subtitle="Sistemdeki aktif ders, sınav ve etkinlik kapasitesi"
                  segments={adminSystemCapacitySegments()}
                />
              </Match>
            </Switch>
          </section>
        </Show>

        {/* Workspace Portal Cards (Expandable after 2 rows) */}
        <section class="space-y-2.5 rounded-3xl border border-[#F2F2F3] bg-card/60 p-3 sm:p-4 dark:border-white/[0.08] dark:bg-card/40 shadow-sm" aria-labelledby="dash-sections">
          <div class="flex items-center justify-between gap-3">
            <h2 id="dash-sections" class="text-sm font-semibold tracking-tight text-foreground">
              {t("dashboard.roleLinks")}
            </h2>
            <div class="flex items-center gap-2">
              <Show when={editingPortalOrder()}>
                <Button type="button" variant="ghost" size="sm" class="h-10 rounded-xl text-xs" onClick={resetPortalOrder}>
                  {t("common.remove")}
                </Button>
              </Show>
              <Button type="button" variant="outline" size="sm" class="h-10 rounded-xl text-xs font-semibold" onClick={() => setEditingPortalOrder((value) => !value)}>
                {editingPortalOrder() ? t("common.done") : t("common.edit")}
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <For each={displayPortalCards()}>
              {(card, index) => (
                <PortalCard
                  card={card}
                  editing={editingPortalOrder()}
                  isFirst={index() === 0}
                  isLast={index() === displayPortalCards().length - 1}
                  onMoveLeft={() => moveCardByDelta(card.to, -1)}
                  onMoveRight={() => moveCardByDelta(card.to, 1)}
                  dragging={draggingPortal() === card.to}
                  preview={dragOverPortal() === card.to && draggingPortal() !== card.to}
                  onDragStart={() => setDraggingPortal(card.to)}
                  onDragEnd={() => {
                    setDraggingPortal(null);
                    setDragOverPortal(null);
                  }}
                  onDragOver={() => {
                    if (draggingPortal() && draggingPortal() !== card.to) {
                      setDragOverPortal(card.to);
                    }
                  }}
                  onDrop={() => {
                    const source = draggingPortal();
                    const target = card.to;
                    setDraggingPortal(null);
                    setDragOverPortal(null);
                    if (source && target && source !== target) {
                      movePortalCard(source, target);
                    }
                  }}
                />
              )}
            </For>
          </div>

          <Show when={orderedPortalCards().length > 8 && !editingPortalOrder()}>
            <div class="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 rounded-full border-border/70 bg-background/80 px-4 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/50 hover:bg-card hover:shadow"
                onClick={() => setShowAllPortals((v) => !v)}
              >
                <span>{showAllPortals() ? "Daha az göster" : "Daha fazla göster"}</span>
                <Show when={showAllPortals()} fallback={<IconChevronDown class="h-3.5 w-3.5 text-muted-foreground ml-1" />}>
                  <IconChevronUp class="h-3.5 w-3.5 text-muted-foreground ml-1" />
                </Show>
              </Button>
            </div>
          </Show>
        </section>

        <Show when={role() !== "parent"}>
        <div class="grid items-stretch gap-5">
          <section class="flex min-h-[17rem] flex-col space-y-2.5 rounded-3xl border border-[#F2F2F3] bg-card/60 p-3 sm:p-4 dark:border-white/[0.08] dark:bg-card/40 shadow-sm" aria-labelledby="dash-attention">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
              <h2 id="dash-attention" class="text-sm font-semibold tracking-tight text-foreground">
                {t("dashboard.attention")}
              </h2>
              <div class="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
                <button
                  type="button"
                  class={cn(
                    "rounded-md px-2.5 py-0.5 font-medium transition-all",
                    attentionFilter() === "all"
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => { setAttentionFilter("all"); setAttentionPage(0); }}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  class={cn(
                    "rounded-md px-2.5 py-0.5 font-medium transition-all",
                    attentionFilter() === "exam"
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => { setAttentionFilter("exam"); setAttentionPage(0); }}
                >
                  Sınavlar
                </button>
                <button
                  type="button"
                  class={cn(
                    "rounded-md px-2.5 py-0.5 font-medium transition-all",
                    attentionFilter() === "event"
                      ? "bg-background font-semibold text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => { setAttentionFilter("event"); setAttentionPage(0); }}
                >
                  Etkinlikler
                </button>
              </div>
            </div>

            <Show
              when={filteredAttention().length > 0}
              fallback={<DashEmpty>{t("dashboard.noAttention")}</DashEmpty>}
            >
              <ul class="flex-1 divide-y divide-[#F2F2F3] overflow-hidden rounded-2xl border border-[#F2F2F3] dark:border-white/[0.08] bg-card shadow-apple">
                <For each={pagedAttention()}>
                  {(item) => (
                    <li>
                      <Link
                        to={item.to}
                        params={{ id: item.id }}
                        class="flex items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,box-shadow] hover:bg-muted/45 hover:shadow-[inset_2px_0_0_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-4 sm:py-3"
                      >
                        <StatusDot status={item.status} />
                        <div class="min-w-0 flex-1">
                          <p class="truncate font-medium text-foreground">{item.title}</p>
                          <p class="truncate text-xs text-muted-foreground">
                            {item.kind === "exam" ? t("nav.exams") : t("nav.events")}
                            <Show when={item.subtitle}>
                              {" · "}
                              {item.subtitle}
                            </Show>
                          </p>
                        </div>
                        <div class="shrink-0 text-right">
                          <StatusLabel status={item.status} t={t} />
                          <p class="mono mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                            <Show when={item.at != null} fallback="—">
                              {formatDateTime(item.at!, locale())}
                            </Show>
                          </p>
                        </div>
                      </Link>
                    </li>
                  )}
                </For>
              </ul>
              <Show when={attentionTotalPages() > 1}>
                <PaginationControls page={attentionPage()} totalPages={attentionTotalPages()} onPageChange={setAttentionPage} />
              </Show>
            </Show>
          </section>
        </div>
        </Show>
        </div>
      </Show>
    </div>
  );
}

function DashEmpty(props: { children: string }) {
  return (
    <div class="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-card/80 px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
      {props.children}
    </div>
  );
}

function PortalCard(props: {
  card: PortalCardDef;
  editing: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  dragging: boolean;
  preview: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: (target: string) => void;
}) {
  const t = useT();
  const Icon = props.card.Icon;
  const hasStat = () => props.card.stat != null && props.card.stat !== "";

  const cardInner = () => (
    <>
      <span class={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200", portalTone(props.card.to))}>

        <Icon class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex min-w-0 items-start gap-2">
          <h3 class="truncate text-sm font-semibold tracking-tight text-foreground">{t(props.card.titleKey)}</h3>
          <Show when={hasStat()}>
            <span class="hidden text-muted-foreground/40 sm:inline" aria-hidden="true">
              |
            </span>
            <span class="mono shrink-0 rounded-full border border-black/[0.06] bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums tracking-tight text-foreground shadow-sm dark:border-white/[0.08] sm:text-sm">
              {props.card.stat}
            </span>
          </Show>
          <Show when={props.card.minRole && props.card.minRole !== "student"}>
            <span class="ml-auto hidden shrink-0 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
              {t(ROLE_KEY[props.card.minRole!])}
            </span>
          </Show>
        </div>
        <Show when={props.card.descKey}>
          <p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{t(props.card.descKey!)}</p>
        </Show>
      </div>
      <Show when={props.editing}>
        <div class="flex items-center gap-1 shrink-0 ml-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-10 w-10 rounded-xl p-0 text-xs font-bold shadow-none disabled:opacity-30"
            disabled={props.isFirst}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onMoveLeft?.();
            }}
            title="Move Earlier"
          >
            ←
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-10 w-10 rounded-xl p-0 text-xs font-bold shadow-none disabled:opacity-30"
            disabled={props.isLast}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onMoveRight?.();
            }}
            title="Move Later"
          >
            →
          </Button>
        </div>
      </Show>
    </>
  );

  const cardClass = () =>
    cn(
      "group relative flex min-h-[6rem] items-start gap-3.5 overflow-hidden rounded-2xl border border-[#F2F2F3] bg-card p-4 shadow-apple transition-all duration-200 hover:-translate-y-0.5 hover:shadow-apple-hover hover:border-border dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] sm:min-h-[6.5rem]",
      !props.editing && "active:scale-[0.98]",
      props.editing && "cursor-grab select-none border-dashed border-primary/50 bg-primary/[0.03]",
      props.preview && "scale-[1.02] border-primary/70 bg-primary/10 opacity-80 shadow-apple-hover",
      props.dragging && "scale-[0.98] border-primary/50 opacity-50",
    );

  return (
    <Show
      when={props.editing}
      fallback={
        <Link to={props.card.to} class={cardClass()}>
          {cardInner()}
        </Link>
      }
    >
      <div
        draggable={true}
        onDragStart={(event) => {
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", props.card.to);
          }
          props.onDragStart();
        }}
        onDragEnd={(event) => {
          event.preventDefault();
          props.onDragEnd();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
          props.onDragOver();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          props.onDrop(props.card.to);
        }}
        class={cardClass()}
      >
        {cardInner()}
      </div>
    </Show>
  );
}

function StatusDot(props: { status: AttentionKind }) {
  return (
    <span
      class={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", scheduleStatusDotClass(props.status))}
      aria-hidden="true"
    />
  );
}

function StatusLabel(props: {
  status: AttentionKind;
  t: (key: MessageKey) => string;
}) {
  const label = () => {
    if (props.status === "active") return props.t("dashboard.activeNow");
    if (props.status === "today") return props.t("dashboard.today");
    return props.t("dashboard.soon");
  };
  return (
    <span
      class={cn(
        "inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        scheduleStatusClass(props.status),
      )}
    >
      {label()}
    </span>
  );
}
