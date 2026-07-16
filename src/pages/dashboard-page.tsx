import { For, Show, createMemo, createResource, type Component } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { formatApiError } from "@/api/client";
import { getCourses } from "@/api/getCourses";
import { getEvents } from "@/api/getEvents";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { getMyMarks } from "@/api/getMyMarks";
import { getNotes } from "@/api/getNotes";
import type { Exam, Event, Role } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import {
  IconBook,
  IconBriefcase,
  IconCalendar,
  IconCalendarDays,
  IconChart,
  IconClipboardCheck,
  IconExam,
  IconNote,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ATTENTION_LIMIT = 8;
const UPCOMING_LIMIT = 6;

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
  descKey: MessageKey;
  Icon: Component<{ class?: string }>;
  stat?: string;
  minRole?: Role;
};

const ROLE_KEY: Record<Role, MessageKey> = {
  student: "role.student",
  teacher: "role.teacher",
  manager: "role.manager",
  admin: "role.admin",
};

function examWindow(exam: Exam, now: number): AttentionKind | "upcoming" | "past" | "unscheduled" {
  if (exam.mode === "open") return "active";
  if (exam.mode !== "sync" && exam.mode !== "async") return "unscheduled";
  if (exam.ends_at != null && exam.ends_at < now) return "past";
  if (exam.starts_at != null && exam.starts_at > now) {
    const delta = exam.starts_at - now;
    if (delta <= 24 * 60 * 60 * 1000) return "today";
    if (delta <= WEEK_MS) return "soon";
    return "upcoming";
  }
  return "active";
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
  const now = () => Date.now();

  const [courses] = createResource(
    () => (role() !== "student" ? true : null),
    async (enabled) => (enabled ? (await getCourses()).items : []),
    { initialValue: [] },
  );
  const [myCourses] = createResource(
    () => (role() === "student" ? true : null),
    async (enabled) => {
      if (!enabled) return [];
      try {
        return (await getMyCourses()).items;
      } catch {
        return [];
      }
    },
    { initialValue: [] },
  );
  const [events] = createResource(async () => (await getEvents()).items, { initialValue: [] });
  const [exams] = createResource(async () => (await getExams()).items, { initialValue: [] });
  const [notes] = createResource(async () => (await getNotes()).items, { initialValue: [] });
  const [marks] = createResource(
    () => (role() === "student" ? true : null),
    async (enabled) => (enabled ? getMyMarks() : null),
  );

  const resourceError = createMemo(() => {
    const e = courses.error || myCourses.error || events.error || exams.error || notes.error || marks.error;
    return e ? formatApiError(e, locale()) : null;
  });

  const loading = () =>
    (role() === "student" ? myCourses.loading : courses.loading) ||
    events.loading ||
    exams.loading ||
    notes.loading;

  const fullName = () => [user().name, user().surname].filter(Boolean).join(" ") || user().username;
  const hasGlobalScope = createMemo(() => hasMinRole(role(), "admin"));
  const scopedCourses = createMemo(() => (role() === "student" ? myCourses() : courses()));
  const scopedCourseIds = createMemo(() => new Set(scopedCourses().map((c) => c.id)));

  const courseMap = createMemo(() => {
    const map = new Map<string, string>();
    for (const course of scopedCourses()) map.set(course.id, course.title);
    return map;
  });

  const visibleExams = createMemo(() => {
    const all = exams();
    if (hasGlobalScope()) return all;
    const allowed = scopedCourseIds();
    if (role() === "student" || role() === "teacher") {
      if (allowed.size === 0) return [];
      return all.filter((exam) => allowed.has(exam.course));
    }
    return all;
  });

  const courseCount = createMemo(() => scopedCourses().length);
  const examCount = createMemo(() => visibleExams().length);
  const eventCount = createMemo(() => events().length);
  const noteCount = createMemo(() => notes().length);
  const overallAvg = createMemo(() => marks()?.overall_average ?? null);
  const avgLabel = createMemo(() =>
    overallAvg() == null ? "—" : (Math.round(overallAvg()! * 10) / 10).toString(),
  );

  const portalCards = createMemo<PortalCardDef[]>(() => {
    const r = role();
    const cc = String(courseCount());
    const ec = String(examCount());
    const evc = String(eventCount());
    const nc = String(noteCount());
    const list: PortalCardDef[] = [];

    if (r === "student") {
      list.push(
        { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
        { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
        { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc },
        { Icon: IconChart, titleKey: "nav.marks", to: "/marks", descKey: "dashboard.portal.marksDesc", stat: avgLabel() },
        { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
      );
      return list;
    }

    if (r === "teacher") {
      list.push(
        { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
        { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
        { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc, minRole: "teacher" },
        { Icon: IconChart, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", minRole: "teacher" },
        { Icon: IconClipboardCheck, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", minRole: "teacher" },
        { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
        { Icon: IconBriefcase, titleKey: "nav.work", to: "/work", descKey: "dashboard.portal.workDesc", minRole: "teacher" },
      );
      return list;
    }

    // manager + admin
    list.push(
      { Icon: IconBook, titleKey: "nav.courses", to: "/courses", descKey: "dashboard.portal.coursesDesc", stat: cc },
      { Icon: IconExam, titleKey: "nav.exams", to: "/exams", descKey: "dashboard.portal.examsDesc", stat: ec },
      { Icon: IconCalendar, titleKey: "nav.events", to: "/events", descKey: "dashboard.portal.eventsDesc", stat: evc },
      { Icon: IconNote, titleKey: "nav.notes", to: "/notes", descKey: "dashboard.portal.notesDesc", stat: nc },
      { Icon: IconChart, titleKey: "nav.studentMarks", to: "/management/student-marks", descKey: "dashboard.portal.studentMarksDesc", minRole: "teacher" },
      { Icon: IconClipboardCheck, titleKey: "nav.studentAttendance", to: "/management/student-attendance", descKey: "dashboard.portal.attendanceDesc", minRole: "teacher" },
      { Icon: IconSettings, titleKey: "nav.settings", to: "/management/settings", descKey: "dashboard.portal.settingsDesc", minRole: "manager" },
      { Icon: IconCalendarDays, titleKey: "nav.terms", to: "/management/terms", descKey: "dashboard.portal.termsDesc", minRole: "manager" },
    );
    if (r === "manager") {
      list.push({ Icon: IconBriefcase, titleKey: "nav.work", to: "/work", descKey: "dashboard.portal.workDesc", minRole: "teacher" });
    }
    list.push({ Icon: IconBriefcase, titleKey: "nav.staffWork", to: "/management/staff-work", descKey: "dashboard.portal.workDesc", minRole: "manager" });
    if (r === "admin") {
      list.push({ Icon: IconUsers, titleKey: "nav.users", to: "/admin/users", descKey: "dashboard.portal.usersDesc", minRole: "admin" });
    }
    return list;
  });

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

    for (const event of events()) {
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
      })
      .slice(0, ATTENTION_LIMIT);
  });

  const upcoming = createMemo(() => {
    const n = now();
    const items: { id: string; kind: "exam" | "event"; title: string; at: number; subtitle: string }[] = [];

    for (const exam of visibleExams()) {
      if (exam.starts_at != null && exam.starts_at > n && exam.starts_at <= n + WEEK_MS) {
        const w = examWindow(exam, n);
        if (w === "upcoming" || w === "soon" || w === "today") {
          items.push({
            id: exam.id,
            kind: "exam",
            title: exam.title,
            at: exam.starts_at,
            subtitle: courseMap().get(exam.course) ?? examKindLabel(String(exam.kind), t),
          });
        }
      }
    }

    for (const event of events()) {
      if (event.starts_at != null && event.starts_at > n && event.starts_at <= n + WEEK_MS) {
        items.push({
          id: event.id,
          kind: "event",
          title: event.title,
          at: event.starts_at,
          subtitle: event.description || t("nav.events"),
        });
      }
    }

    return items.sort((a, b) => a.at - b.at).slice(0, UPCOMING_LIMIT);
  });

  return (
    <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header class="flex flex-wrap items-end justify-between gap-3 border-b border-border/80 bg-muted/20 px-4 py-4 sm:px-5">
        <div class="min-w-0 space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("dashboard.today")}</p>
          <h1 class="truncate font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("dashboard.greeting", { name: fullName() })}
          </h1>
          <p class="text-sm text-muted-foreground">{t("dashboard.observationOnly")}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span class="rounded-md border border-border bg-background px-2 py-1 font-medium text-foreground shadow-sm">
            {t(ROLE_KEY[role()])}
          </span>
          <span class="mono tabular-nums">{formatDateTime(Date.now(), locale()).split(",")[0]}</span>
        </div>
      </header>

      <Show when={resourceError()}>
        {(msg) => <div class="px-4 pt-4 sm:px-5"><Alert variant="destructive">{msg()}</Alert></div>}
      </Show>

      <Show when={!loading()} fallback={<div class="px-4 py-8"><PageSpinner /></div>}>
        <div class="space-y-5 bg-background/40 px-4 py-4 sm:px-5 sm:py-5">
        <section class="space-y-2.5" aria-labelledby="dash-sections">
          <h2 id="dash-sections" class="text-sm font-semibold tracking-tight text-foreground">
            {t("dashboard.roleLinks")}
          </h2>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={portalCards()}>{(card) => <PortalCard card={card} />}</For>
          </div>
        </section>

        <div class="grid gap-5 lg:grid-cols-2">
          <section class="space-y-2.5" aria-labelledby="dash-attention">
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
              <ul class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <For each={attention()}>
                  {(item) => (
                    <li>
                      <Link
                        to={item.to}
                        params={{ id: item.id }}
                        class="flex items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,box-shadow] hover:bg-muted/40 hover:shadow-[inset_2px_0_0_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-4 sm:py-3"
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
            </Show>
          </section>

          <section class="space-y-2.5" aria-labelledby="dash-upcoming">
            <h2 id="dash-upcoming" class="text-sm font-semibold tracking-tight text-foreground">
              {t("dashboard.upcoming")}
            </h2>
            <Show
              when={upcoming().length > 0}
              fallback={<DashEmpty>{t("dashboard.upcomingEmpty")}</DashEmpty>}
            >
              <ul class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <For each={upcoming()}>
                  {(item) => (
                    <li>
                      <Link
                        to={item.kind === "exam" ? "/exams/$id" : "/events/$id"}
                        params={{ id: item.id }}
                        class="flex items-center gap-3 px-3 py-2.5 text-sm transition-[background-color,box-shadow] hover:bg-muted/40 hover:shadow-[inset_2px_0_0_hsl(var(--primary)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:px-4 sm:py-3"
                      >
                        <span class="mono w-24 shrink-0 text-[11px] tabular-nums text-muted-foreground sm:w-28 sm:text-xs">
                          {formatDateTime(item.at, locale())}
                        </span>
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
                      </Link>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>
        </div>
        </div>
      </Show>
    </div>
  );
}

function DashEmpty(props: { children: string }) {
  return (
    <div class="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
      {props.children}
    </div>
  );
}

function PortalCard(props: { card: PortalCardDef }) {
  const t = useT();
  const Icon = props.card.Icon;
  const hasStat = () => props.card.stat != null && props.card.stat !== "";

  return (
    <Link
      to={props.card.to}
      class="group relative flex min-h-[6rem] items-start gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary before:opacity-0 before:transition-opacity hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted/30 hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)] hover:before:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:min-h-[6.5rem] sm:gap-3.5 sm:px-4 sm:py-3.5"
    >
      <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
        <Icon class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1 space-y-1">
        <div class="flex min-w-0 items-start gap-2">
          <h3 class="truncate text-sm font-semibold tracking-tight text-foreground">{t(props.card.titleKey)}</h3>
          <Show when={hasStat()}>
            <span class="hidden text-muted-foreground/50 sm:inline" aria-hidden="true">
              |
            </span>
            <span class="mono shrink-0 text-sm font-semibold tabular-nums tracking-tight text-foreground sm:text-base">
              {props.card.stat}
            </span>
          </Show>
          <Show when={props.card.minRole && props.card.minRole !== "student"}>
            <span class="ml-auto hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
              {t(ROLE_KEY[props.card.minRole!])}
            </span>
          </Show>
        </div>
        <p class="line-clamp-2 text-xs leading-5 text-muted-foreground">{t(props.card.descKey)}</p>
      </div>
    </Link>
  );
}

function StatusDot(props: { status: AttentionKind }) {
  return (
    <span
      class={cn(
        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
        props.status === "active" && "bg-success",
        props.status === "today" && "bg-warning",
        props.status === "soon" && "bg-muted-foreground",
      )}
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
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        props.status === "active" && "border-success/30 bg-success/10 text-success",
        props.status === "today" && "border-warning/30 bg-warning/10 text-warning",
        props.status === "soon" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {label()}
    </span>
  );
}
