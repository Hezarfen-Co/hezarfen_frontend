import { For, Show, createEffect, createMemo, createResource, createSignal, type Component } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { formatApiError } from "@/api/client";
import { getMyStudents } from "@/api/parents";
import { getCourses } from "@/api/courses";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getMyCourses } from "@/api/reports";
import { getMyMarks } from "@/api/reports";
import { getNotes } from "@/api/notes";
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
  student: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  parent: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  teacher: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  manager: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  admin: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

function portalTone(to: string) {
  if (to.includes("exam")) return "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 group-hover:bg-indigo-500/15 dark:text-indigo-300";
  if (to.includes("course") || to.includes("studies") || to.includes("clubs")) return "border-sky-500/20 bg-sky-500/10 text-sky-700 group-hover:bg-sky-500/15 dark:text-sky-300";
  if (to.includes("event") || to.includes("calendar")) return "border-amber-500/20 bg-amber-500/10 text-amber-700 group-hover:bg-amber-500/15 dark:text-amber-300";
  if (to.includes("mark") || to.includes("attendance")) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 group-hover:bg-emerald-500/15 dark:text-emerald-300";
  if (to.includes("message") || to.includes("student") || to.includes("users")) return "border-violet-500/20 bg-violet-500/10 text-violet-700 group-hover:bg-violet-500/15 dark:text-violet-300";
  if (to.includes("work") || to.includes("settings")) return "border-slate-500/20 bg-slate-500/10 text-slate-700 group-hover:bg-slate-500/15 dark:text-slate-300";
  return "border-primary/20 bg-primary/10 text-primary group-hover:bg-primary/15";
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
  const overallAvg = createMemo(() => marks()?.overall_average ?? null);
  const avgLabel = createMemo(() =>
    overallAvg() == null ? "—" : (Math.round(overallAvg()! * 10) / 10).toString(),
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

  const attentionTotalPages = createMemo(() => Math.max(1, Math.ceil(attention().length / ATTENTION_LIMIT)));
  const pagedAttention = createMemo(() => {
    const start = attentionPage() * ATTENTION_LIMIT;
    return attention().slice(start, start + ATTENTION_LIMIT);
  });

  createEffect(() => {
    if (attentionPage() >= attentionTotalPages()) setAttentionPage(attentionTotalPages() - 1);
  });

  return (
    <div class="overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-background/70 shadow-apple dark:border-white/[0.08]">
      <header class="flex flex-wrap items-end justify-between gap-3 border-b border-black/[0.06] bg-card/85 px-4 py-4 backdrop-blur-xl dark:border-white/[0.08] sm:px-5">
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
        <div class="space-y-5 bg-muted/20 px-4 py-4 sm:px-5 sm:py-5">
        <section class="space-y-2.5 rounded-3xl border border-sky-500/10 bg-sky-500/[0.025] p-3 sm:p-4" aria-labelledby="dash-sections">
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
            <For each={orderedPortalCards()}>
              {(card, index) => (
                <PortalCard
                  card={card}
                  editing={editingPortalOrder()}
                  isFirst={index() === 0}
                  isLast={index() === orderedPortalCards().length - 1}
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
        </section>

        <Show when={role() !== "parent"}>
        <div class="grid items-stretch gap-5">
          <section class="flex min-h-[17rem] flex-col space-y-2.5 rounded-3xl border border-amber-500/10 bg-amber-500/[0.025] p-3 sm:p-4" aria-labelledby="dash-attention">
            <div class="flex items-baseline justify-between gap-2">
              <h2 id="dash-attention" class="text-sm font-semibold tracking-tight text-foreground">
                {t("dashboard.attention")}
              </h2>
              <Show when={attention().length === 0}>
                <span class="text-xs text-muted-foreground">{t("dashboard.allClear")}</span>
              </Show>
            </div>

            <Show
              when={attention().length > 0}
              fallback={<DashEmpty>{t("dashboard.noAttention")}</DashEmpty>}
            >
              <ul class="flex-1 divide-y divide-border/80 overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-card shadow-apple">
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
      <span class={cn("mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors", portalTone(props.card.to))}>
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
      "group relative flex min-h-[6rem] items-start gap-3.5 overflow-hidden rounded-2xl border border-black/[0.06] bg-card p-4 shadow-apple transition-[background-color,border-color,box-shadow] duration-200 hover:bg-card/90 hover:border-border dark:border-white/[0.08] sm:min-h-[6.5rem]",
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
