import { For, Show, Suspense, createMemo } from "solid-js";
import { createBoardResources } from "@/lib/board-resources";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { createInstanceLabels } from "@/lib/instance-labels";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getHomework } from "@/api/homework";
import { getAppointments } from "@/api/appointments";
import { getCourses } from "@/api/courses";
import { getInstanceSessions, getMyInstances } from "@/api/instances";
import type { Appointment, AppointmentStatus, Course, Page } from "@/api/client";
import { appointmentStatusClass, appointmentStatusDotClass, appointmentStatusLabelKey } from "@/lib/appointment-status";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { IconCalendarDays, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { createUrlEnum, createUrlParam, readString } from "@/lib/url-state";
import { createNow } from "@/lib/create-now";
import { appointmentCounterpart } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SHORT_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** Courses whose sessions are pulled in. Sessions are per-course reads — there
 *  is no school-wide session list — so the fan-out is bounded. */
const SESSION_COURSE_CAP = 25;
/** Chips a single day cell shows before collapsing the rest into "+N". */
const CHIPS_PER_CELL = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type CalendarKind = "lesson" | "study" | "exam" | "homework" | "event" | "appointment";

type CalendarItem = {
  id: string;
  kind: CalendarKind;
  title: string;
  at: number;
  endsAt: number | null;
  href: string;
  /** The şube×ders an exam or homework belongs to, for its "<ders> — <şube>" line. */
  instance?: string;
  /** Appointments carry their own badge instead of the plain category one. */
  status?: AppointmentStatus;
};

type KindStyle = {
  labelKey: MessageKey;
  chip: string;
  dot: string;
  card: string;
  hover: string;
  heading: string;
  titleHover: string;
};

// Ordered: this is also the order categories appear in a day cell and in the
// side panel, so the school day reads top-down.
const KIND_STYLES: Record<CalendarKind, KindStyle> = {
  lesson: {
    labelKey: "calendar.lessons",
    chip: "bg-sky-100 text-sky-700 dark:border dark:border-sky-800/50 dark:bg-sky-950/60 dark:text-sky-300",
    dot: "bg-sky-500",
    card: "border-sky-500/40 dark:border-sky-500/30",
    hover: "hover:border-sky-500/70 dark:hover:border-sky-500/70",
    heading: "text-sky-500",
    titleHover: "group-hover:text-sky-500",
  },
  study: {
    labelKey: "calendar.studies",
    chip: "bg-amber-100 text-amber-700 dark:border dark:border-amber-800/50 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "bg-amber-500",
    card: "border-amber-500/40 dark:border-amber-500/30",
    hover: "hover:border-amber-500/70 dark:hover:border-amber-500/70",
    heading: "text-amber-500",
    titleHover: "group-hover:text-amber-500",
  },
  exam: {
    labelKey: "calendar.exams",
    chip: "bg-rose-100 text-rose-700 dark:border dark:border-rose-800/50 dark:bg-rose-950/60 dark:text-rose-300",
    dot: "bg-rose-500",
    card: "border-rose-500/40 dark:border-rose-500/30",
    hover: "hover:border-rose-500/70 dark:hover:border-rose-500/70",
    heading: "text-rose-500",
    titleHover: "group-hover:text-rose-500",
  },
  homework: {
    labelKey: "calendar.homework",
    chip: "bg-orange-100 text-orange-700 dark:border dark:border-orange-800/50 dark:bg-orange-950/60 dark:text-orange-300",
    dot: "bg-orange-500",
    card: "border-orange-500/40 dark:border-orange-500/30",
    hover: "hover:border-orange-500/70 dark:hover:border-orange-500/70",
    heading: "text-orange-500",
    titleHover: "group-hover:text-orange-500",
  },
  event: {
    labelKey: "calendar.events",
    chip: "bg-emerald-100 text-emerald-700 dark:border dark:border-emerald-800/50 dark:bg-emerald-950/60 dark:text-emerald-300",
    dot: "bg-emerald-500",
    card: "border-emerald-500/40 dark:border-emerald-500/30",
    hover: "hover:border-emerald-500/70 dark:hover:border-emerald-500/70",
    heading: "text-emerald-500",
    titleHover: "group-hover:text-emerald-500",
  },
  appointment: {
    labelKey: "calendar.appointments",
    chip: "bg-violet-100 text-violet-700 dark:border dark:border-violet-800/50 dark:bg-violet-950/60 dark:text-violet-300",
    dot: "bg-violet-500",
    card: "border-violet-500/40 dark:border-violet-500/30",
    hover: "hover:border-violet-500/70 dark:hover:border-violet-500/70",
    heading: "text-violet-500",
    titleHover: "group-hover:text-violet-500",
  },
};

const KIND_ORDER = Object.keys(KIND_STYLES) as CalendarKind[];

/** Day / week / month, the three zoom levels a phone calendar is expected to
 *  offer. The month grid alone is unreadable at 45px per cell. */
type CalendarView = "day" | "week" | "month";

/** Page size for the windowed reads below; a busy month outgrows one page. */
const FEED_PAGE = 100;

/**
 * Read every row the server window matches: follow `offset` until the
 * envelope's `total` is drained. The loop is bounded by the server total — a
 * stale total can cost one extra page, never spin, and nothing is dropped
 * behind a silent cap.
 */
async function fetchWindow<T>(fetchPage: (params: { limit: number; offset: number }) => Promise<Page<T>>): Promise<T[]> {
  const first = await fetchPage({ limit: FEED_PAGE, offset: 0 });
  const items = [...first.items];
  while (items.length < first.total) {
    const next = await fetchPage({ limit: FEED_PAGE, offset: items.length });
    if (next.items.length === 0) break;
    items.push(...next.items);
  }
  return items;
}

const VIEWS: { id: CalendarView; labelKey: MessageKey }[] = [
  { id: "day", labelKey: "calendar.viewDay" },
  { id: "week", labelKey: "calendar.viewWeek" },
  { id: "month", labelKey: "calendar.viewMonth" },
];

/** `?date=2026-09-24` → a day key; null when the text is not a real date. */
function isoToDateKey(raw: unknown): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(readString(raw));
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return d.getDate() === Number(match[3]) ? dateKey(d) : null;
}

/** A day key (zero-based month) → `2026-09-24` for the URL. */
function dateKeyToIso(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarPage() {
  return (
    <RouteGuard>
      <CalendarContent />
    </RouteGuard>
  );
}

function CalendarContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const nowDate = () => new Date(now());
  // View, selected day and shown month live in the URL (`?view=week&date=
  // 2026-09-24&month=2026-10`), so Back from an item returns to the same
  // view and day instead of this month's grid. Today is the bare URL.
  const [view, setView] = createUrlEnum<CalendarView>("view", ["day", "week", "month"], "month");
  const [selected, setSelected] = createUrlParam("date", {
    parse: (raw) => isoToDateKey(raw) ?? dateKey(nowDate()),
    serialize: (key: string) => (key === dateKey(nowDate()) ? undefined : dateKeyToIso(key)),
  });
  // The month grid follows the selected day unless paged away from it.
  const selectedMonth = () => {
    const [y, m] = selected().split("-").map(Number);
    return { year: y, month: m };
  };
  const [shownMonth, setShownMonth] = createUrlParam("month", {
    parse: (raw) => {
      const match = /^(\d{4})-(\d{2})$/.exec(readString(raw));
      return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : selectedMonth();
    },
    serialize: (value: { year: number; month: number }) => {
      const base = selectedMonth();
      return value.year === base.year && value.month === base.month
        ? undefined
        : `${value.year}-${String(value.month + 1).padStart(2, "0")}`;
    },
  });
  const viewYear = () => shownMonth().year;
  const viewMonth = () => shownMonth().month;
  const showMonthOf = (d: Date) => setShownMonth({ year: d.getFullYear(), month: d.getMonth() });

  // Each feed stands alone: a failed one reads as empty and is named in the
  // notice above the grid, instead of blanking the whole calendar.
  const board = createBoardResources();
  // Events and exams take a schedule window, so they are read from the first
  // day the grid can show (the month's leading week included) onward. The
  // window only ever widens backwards: paging forward stays inside what is
  // loaded, paging to an earlier month refetches. Offsets follow the envelope
  // total, so a window busier than one page still arrives whole.
  const viewStart = () => new Date(viewYear(), viewMonth(), 1).getTime() - 7 * DAY_MS;
  const loadedFrom = createMemo<number>((prev) => Math.min(prev, viewStart()), viewStart());
  const [events] = board.createResource(loadedFrom, async (from) => fetchWindow((page) => getEvents({ ...page, ends_after: from })));
  const [exams] = board.createResource(loadedFrom, async (from) => fetchWindow((page) => getExams({ ...page, ends_after: from })));
  // Homework and appointments are bound to the visible month itself: a
  // two-sided window cannot widen incrementally, so the source key is the
  // month and paging months refetches. Homework filters on its due date,
  // appointments on their start.
  const monthWindow = () => ({
    start: new Date(viewYear(), viewMonth(), 1).getTime(),
    end: new Date(viewYear(), viewMonth() + 1, 1).getTime(),
  });
  const [appointments] = board.createResource(
    monthWindow,
    async (bounds) => fetchWindow((page) => getAppointments({ ...page, starts_after: bounds.start, starts_before: bounds.end })),
  );
  const [homework] = board.createResource(
    monthWindow,
    async (bounds) => fetchWindow((page) => getHomework({ ...page, due_after: bounds.start, due_before: bounds.end })),
  );

  // Lessons and study/club meetings both come from course sessions; the course's
  // own `kind` is what separates them.
  const [sessions] = board.createResource(
    () => {
      const role = auth.user()?.role ?? null;
      return role ? `${role}|${loadedFrom()}` : null;
    },
    async (key) => {
      // Sessions read from the earliest viewed month onward — like events and
      // exams, the window only widens backwards, so future months ride the
      // already-loaded rows and paging to an earlier month refetches.
      const from = Number(key.split("|")[1]);
      // Sessions hang off the instance (şube × ders) now; the catalog course is
      // still what says whether a meeting is a ders, an etüt or a kulüp.
      const [instances, courses] = await Promise.all([
        getMyInstances({ limit: 200 }),
        getCourses(),
      ]);
      const byId = new Map<string, Course>(courses.items.map((course) => [course.id, course]));
      const pages = await mapConcurrent(
        instances.items.slice(0, SESSION_COURSE_CAP), FAN_OUT_LIMIT, async (instance) => {
          const course = byId.get(instance.course);
          if (!course) return [];
          try {
            const items = await fetchWindow((page) => getInstanceSessions(instance.id, { ...page, starts_after: from }));
            return items.map((session) => ({ session, course }));
          } catch {
            // One unreadable section must not empty the whole calendar.
            return [];
          }
        },
      );
      return pages.flat();
    },
  );
  const feeds = [
    { resource: sessions, labelKey: "calendar.lessons" },
    { resource: exams, labelKey: "calendar.exams" },
    { resource: homework, labelKey: "calendar.homework" },
    { resource: events, labelKey: "calendar.events" },
    { resource: appointments, labelKey: "calendar.appointments" },
  ] as const;
  const loadingFeeds = () => feeds.some((feed) => feed.resource.loading);
  const failedFeeds = () => feeds.filter((feed) => feed.resource.error).map((feed) => t(feed.labelKey));

  const counterpart = (a: Appointment) => appointmentCounterpart(a, auth.user()?.id);

  const items = createMemo<CalendarItem[]>(() => {
    const rows: CalendarItem[] = [];
    for (const { session, course } of sessions() ?? []) {
      rows.push({
        id: session.id,
        kind: course.kind === "course" ? "lesson" : "study",
        title: session.topic?.trim() || course.title,
        at: session.starts_at,
        endsAt: session.ends_at,
        href: `/courses/${course.id}`,
      });
    }
    for (const exam of exams() ?? []) {
      if (!exam.starts_at || exam.draft) continue;
      rows.push({ id: exam.id, kind: "exam", title: exam.title, at: exam.starts_at, endsAt: exam.ends_at, href: `/exams/${exam.id}`, instance: exam.class_course });
    }
    for (const hw of homework() ?? []) {
      rows.push({ id: hw.id, kind: "homework", title: hw.title, at: hw.due_at, endsAt: null, href: `/homework/${hw.id}`, instance: hw.class_course });
    }
    for (const event of events() ?? []) {
      if (!event.starts_at) continue;
      rows.push({ id: event.id, kind: "event", title: event.title, at: event.starts_at, endsAt: event.ends_at, href: `/events/${event.id}` });
    }
    for (const appointment of appointments() ?? []) {
      if (!appointment.starts_at || (appointment.status !== "pending" && appointment.status !== "approved")) continue;
      rows.push({
        id: appointment.id,
        kind: "appointment",
        title: counterpart(appointment),
        at: appointment.starts_at,
        endsAt: appointment.ends_at,
        href: "/appointments",
        status: appointment.status,
      });
    }
    return rows;
  });

  // The same ders runs in several şubeler and their exams/homework share
  // titles, so a chip leads with the şube and the agenda names "<ders> — <şube>".
  const sectionLabels = createInstanceLabels(
    () => items().flatMap((item) => (item.instance ? [item.instance] : [])),
    () => auth.user()?.role,
  );
  const sectionOf = (item: CalendarItem) => (item.instance ? sectionLabels()[item.instance] : undefined);
  const chipTitle = (item: CalendarItem) => {
    const klass = sectionOf(item)?.className;
    return klass ? `${klass} · ${item.title}` : item.title;
  };

  const itemsByDay = createMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items()) {
      const key = dateKey(new Date(item.at));
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    // Category order first, then time — a day cell should read as a timetable.
    for (const bucket of map.values()) {
      bucket.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.at - b.at);
    }
    return map;
  });

  const monthLabel = () => {
    const names = locale() === "tr" ? MONTH_NAMES_TR : MONTH_NAMES;
    return `${names[viewMonth()]} ${viewYear()}`;
  };
  const dayNames = () => locale() === "tr" ? DAY_NAMES_SHORT_TR : DAY_NAMES_SHORT;
  // Monday-first: shift Sunday (0) to the end of the week.
  const firstDay = () => (new Date(viewYear(), viewMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = () => new Date(viewYear(), viewMonth() + 1, 0).getDate();

  const grid = createMemo(() => {
    const cells: { day: number; other: boolean }[] = [];
    for (let i = 0; i < firstDay(); i++) cells.push({ day: 0, other: true });
    for (let d = 1; d <= daysInMonth(); d++) cells.push({ day: d, other: false });
    return cells;
  });

  const selectedDay = () => {
    const [y, m, d] = selected().split("-").map(Number);
    return new Date(y, m, d);
  };
  const selectedItems = () => itemsByDay().get(selected()) ?? [];
  const selectedGroups = createMemo(() =>
    KIND_ORDER
      .map((kind) => ({ kind, rows: selectedItems().filter((item) => item.kind === kind) }))
      .filter((group) => group.rows.length > 0),
  );
  const isToday = (day: number) => {
    const n = nowDate();
    return n.getFullYear() === viewYear() && n.getMonth() === viewMonth() && n.getDate() === day;
  };

  const clock = (ms: number | null) =>
    ms == null ? "" : new Date(ms).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const timeRange = (item: CalendarItem) => (item.endsAt ? `${clock(item.at)} — ${clock(item.endsAt)}` : clock(item.at));

  const intl = () => (locale() === "tr" ? "tr-TR" : "en-US");

  /** Moves the selected day, keeping the month grid on the same page as it. */
  const shiftSelected = (days: number) => {
    const d = selectedDay();
    d.setDate(d.getDate() + days);
    setSelected(dateKey(d));
    showMonthOf(d);
  };

  // Monday-first, like the month grid.
  const weekDays = createMemo(() => {
    const start = selectedDay();
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  });

  const rangeLabel = () => {
    if (view() === "month") return monthLabel();
    if (view() === "day") {
      return selectedDay().toLocaleDateString(intl(), { day: "numeric", month: "long", year: "numeric" });
    }
    const days = weekDays();
    return `${days[0].toLocaleDateString(intl(), { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString(intl(), { day: "numeric", month: "short", year: "numeric" })}`;
  };

  // One pair of arrows for all three views: they step by whatever is on screen.
  const goPrev = () => (view() === "month" ? prevMonth() : shiftSelected(view() === "week" ? -7 : -1));
  const goNext = () => (view() === "month" ? nextMonth() : shiftSelected(view() === "week" ? 7 : 1));

  const goToday = () => {
    const n = nowDate();
    setSelected(dateKey(n));
    showMonthOf(n);
  };
  const prevMonth = () => showMonthOf(new Date(viewYear(), viewMonth() - 1, 1));
  const nextMonth = () => showMonthOf(new Date(viewYear(), viewMonth() + 1, 1));

  return (
    <div class="space-y-4">
      <section class="data-shell flex flex-col space-y-3 p-3 lg:h-[calc(100dvh-7.5rem)]">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">{t("calendar.title")}</h1>
            <div class="mt-1.5 flex items-center gap-1 sm:gap-2">
              <Button type="button" variant="ghost" size="sm" class="h-8 w-8 rounded-lg p-0" onClick={goPrev} aria-label={t("common.prev")}>
                <IconChevronLeft class="h-4 w-4" />
              </Button>
              <span class="truncate text-sm font-semibold tracking-tight sm:text-base">{rangeLabel()}</span>
              <Button type="button" variant="ghost" size="sm" class="h-8 w-8 rounded-lg p-0" onClick={goNext} aria-label={t("common.next")}>
                <IconChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            {/* Day / week / month, the way a phone calendar switches zoom. */}
            <div class="inline-flex shrink-0 rounded-lg border border-border bg-muted/40 p-0.5">
              <For each={VIEWS}>
                {(entry) => (
                  <button
                    type="button"
                    aria-pressed={view() === entry.id}
                    onClick={() => setView(entry.id)}
                    class={cn(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      view() === entry.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
                    )}
                  >
                    {t(entry.labelKey)}
                  </button>
                )}
              </For>
            </div>
            <Button type="button" variant="outline" size="sm" class="h-9 shrink-0 rounded-lg gap-1 text-sm font-semibold" onClick={goToday}>
              <IconCalendarDays class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">{t("calendar.today")}</span>
            </Button>
          </div>
        </div>

        {/* Legend — six categories share one grid, so the colours need naming. */}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <For each={KIND_ORDER}>
            {(kind) => (
              <span class="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span class={cn("h-2 w-2 rounded-full", KIND_STYLES[kind].dot)} />
                {t(KIND_STYLES[kind].labelKey)}
              </span>
            )}
          </For>
        </div>

        <Show when={failedFeeds().length > 0}>
          <div role="alert" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-text">
            <span class="min-w-0 flex-1">{t("calendar.feedsFailed", { feeds: failedFeeds().join(", ") })}</span>
            <Button type="button" size="sm" variant="outline" class="shrink-0 border-destructive/40" onClick={() => board.retryFailed()}>
              {t("common.tryAgain")}
            </Button>
          </div>
        </Show>
        <Show when={loadingFeeds()}>
          <p role="status" class="text-xs text-muted-foreground">{t("common.loading")}</p>
        </Show>
        <Suspense fallback={<PageSpinner />}>
          <div class={cn("grid min-h-0 flex-1 gap-4", view() === "month" && "xl:grid-cols-[minmax(0,1fr)_20rem]")}>
            <Show when={view() === "week"}>
              {/* Weekly timetable: one column per day, each item a labelled
                  block — the closest real-data equivalent of a school's
                  printed weekly schedule, built from the same session/exam/
                  homework/event/appointment feed as the month grid. */}
              <p class="text-xs text-muted-foreground sm:hidden">{t("calendar.weekScrollHint")}</p>
              <div class="min-h-0 min-w-0 flex-1 overflow-x-auto rounded-lg border bg-card shadow-xs">
                <div class="grid min-h-full min-w-[49rem] grid-cols-7 gap-1 p-1 sm:min-w-0">
                <For each={weekDays()}>
                  {(day) => {
                    const key = dateKey(day);
                    const dayItems = () => itemsByDay().get(key) ?? [];
                    const today = () => dateKey(nowDate()) === key;
                    return (
                      <div
                        class={cn(
                          "flex min-h-0 min-w-0 flex-col gap-1 rounded-md p-1 transition-colors",
                          key === selected() ? "bg-sky-50 ring-1 ring-inset ring-sky-400/50 dark:bg-sky-950/40 dark:ring-sky-500/40" : "",
                        )}
                      >
                        <button type="button" class="flex shrink-0 flex-col items-center gap-1 rounded-md py-1 hover:bg-muted/40" onClick={() => setSelected(key)}>
                          <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {dayNames()[(day.getDay() + 6) % 7]}
                          </span>
                          <span
                            class={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold",
                              today() ? "bg-sky-500 text-white" : "text-foreground",
                            )}
                          >
                            {day.getDate()}
                          </span>
                        </button>
                        <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                          <For each={dayItems()}>
                            {(item) => (
                              <a
                                href={item.href}
                                class={cn("block min-w-0 rounded px-1.5 py-1 text-[11px] leading-tight font-medium", KIND_STYLES[item.kind].chip)}
                              >
                                <span class="block truncate">{clock(item.at)}</span>
                                <span class="block truncate" title={sectionOf(item)?.label}>{chipTitle(item)}</span>
                              </a>
                            )}
                          </For>
                        </div>
                      </div>
                    );
                  }}
                </For>
                </div>
              </div>
            </Show>

            <Show when={view() === "month"}>
            <div class="flex min-h-0 flex-col rounded-lg border bg-card shadow-xs">
              <div class="grid shrink-0 grid-cols-7 border-b">
                <For each={dayNames()}>
                  {(name) => (
                    <div class="border-r border-border/40 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0">
                      {name}
                    </div>
                  )}
                </For>
              </div>
              <div class="grid min-h-0 flex-1 auto-rows-fr grid-cols-7">
                <For each={grid()}>
                  {(cell) => {
                    const key = cell.other ? "" : dateKey(new Date(viewYear(), viewMonth(), cell.day));
                    const dayItems = () => (cell.other ? [] : itemsByDay().get(key) ?? []);
                    const cellToday = !cell.other && isToday(cell.day);
                    const cellSelected = () => !cell.other && key === selected();
                    return (
                      <button
                        type="button"
                        class={cn(
                          "relative flex min-h-12 min-w-0 flex-col overflow-hidden border-b border-r border-border/40 p-1 text-left transition-colors last:border-r-0 hover:bg-muted/40 sm:min-h-17 sm:p-1.5 lg:min-h-0",
                          cell.other && "pointer-events-none bg-muted/20",
                          cellSelected() ? "bg-sky-50/60 ring-1 ring-inset ring-sky-400/50 dark:bg-sky-950/40 dark:ring-sky-500/40" : "",
                          cellToday ? "font-bold text-sky-600 dark:text-sky-400" : ""
                        )}
                        disabled={cell.other}
                        onClick={() => key && setSelected(key)}
                      >
                        <span
                          class={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                            cellToday ? "bg-sky-500 text-white font-semibold" : "",
                            cell.other ? "text-muted-foreground/30" : "text-foreground",
                          )}
                        >
                          {cell.day || ""}
                        </span>
                        <Show when={dayItems().length > 0}>
                          {/* A phone cell is too narrow for titles, so it marks
                              the day with one dot per category instead. */}
                          <div class="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                            <For each={dayItems().slice(0, 4)}>
                              {(item) => <span class={cn("h-1.5 w-1.5 rounded-full", KIND_STYLES[item.kind].dot)} />}
                            </For>
                          </div>
                          <div class="mt-1 hidden min-h-0 flex-1 flex-col justify-end gap-0.5 overflow-hidden sm:flex">
                            <For each={dayItems().slice(0, CHIPS_PER_CELL)}>
                              {(item) => (
                                <span class={cn("inline-flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium leading-none", KIND_STYLES[item.kind].chip)}>
                                  <span class={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_STYLES[item.kind].dot)} />
                                  <span class="truncate" title={sectionOf(item)?.label}>{chipTitle(item)}</span>
                                </span>
                              )}
                            </For>
                            <Show when={dayItems().length > CHIPS_PER_CELL}>
                              <span class="pl-1 text-[11px] font-medium leading-none text-muted-foreground">
                                +{dayItems().length - CHIPS_PER_CELL}
                              </span>
                            </Show>
                          </div>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
            </Show>

            <div class="min-h-0 space-y-3 overflow-y-auto">
              <div class="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
                <h3 class="text-sm font-semibold">
                  {selectedDay().toLocaleDateString(locale() === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}
                </h3>

                <div class="mt-2 space-y-2.5">
                  <Show when={selectedGroups().length === 0}>
                    <p class="text-xs text-muted-foreground">{t("calendar.noEvents")}</p>
                  </Show>

                  <For each={selectedGroups()}>
                    {(group) => (
                      <div class="space-y-2">
                        <p class={cn("text-[11px] font-semibold uppercase tracking-wider", KIND_STYLES[group.kind].heading)}>
                          {t(KIND_STYLES[group.kind].labelKey)}
                        </p>
                        <For each={group.rows}>
                          {(item) => (
                            <a
                              href={item.href}
                              class={cn(
                                "group flex items-start justify-between gap-2 rounded-lg border bg-card p-2.5 shadow-xs transition-all hover:shadow-md",
                                KIND_STYLES[item.kind].card,
                                KIND_STYLES[item.kind].hover,
                              )}
                            >
                              <div class="min-w-0">
                                <p class={cn("truncate text-xs font-semibold", KIND_STYLES[item.kind].titleHover)}>{item.title}</p>
                                <Show when={sectionOf(item)}>
                                  {(section) => <p class="mt-0.5 truncate text-[11px] text-text-default">{section().label}</p>}
                                </Show>
                                <p class="mt-0.5 text-[11px] text-muted-foreground">{timeRange(item)}</p>
                              </div>
                              <Show
                                when={item.status}
                                fallback={<Badge variant="outline" class="shrink-0 text-[11px]">{t(KIND_STYLES[item.kind].labelKey)}</Badge>}
                              >
                                {(status) => (
                                  <Badge variant="outline" class={cn("shrink-0 gap-1 text-[11px]", appointmentStatusClass(status()))}>
                                    <span class={cn("h-1.5 w-1.5 rounded-full", appointmentStatusDotClass(status()))} />
                                    {t(appointmentStatusLabelKey(status()))}
                                  </Badge>
                                )}
                              </Show>
                            </a>
                          )}
                        </For>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </Suspense>
      </section>
    </div>
  );
}
