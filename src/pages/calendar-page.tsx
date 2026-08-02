import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import { getAppointments } from "@/api/appointments";
import type { Appointment, Event, Exam } from "@/api/client";
import { appointmentStatusClass, appointmentStatusDotClass, appointmentStatusLabelKey } from "@/lib/appointment-status";
import { RouteGuard } from "@/components/layout/route-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/page-spinner";
import { IconCalendarDays, IconChevronLeft, IconChevronRight, IconClock } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { appointmentCounterpart } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SHORT_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

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
  const [viewYear, setViewYear] = createSignal(nowDate().getFullYear());
  const [viewMonth, setViewMonth] = createSignal(nowDate().getMonth());
  const [selected, setSelected] = createSignal(dateKey(nowDate()));

  const [events] = createResource(async () => (await getEvents({ limit: 100 })).items, { initialValue: [] });
  const [exams] = createResource(async () => (await getExams({ limit: 100 })).items, { initialValue: [] });
  const [appointments] = createResource(async () => (await getAppointments({ limit: 100 })).items, { initialValue: [] });

  const counterpart = (a: Appointment) => appointmentCounterpart(a, auth.user()?.id);

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

  const itemsByDay = createMemo(() => {
    const map = new Map<string, { events: Event[]; exams: Exam[]; appointments: Appointment[] }>();
    const bucket = (k: string) => {
      if (!map.has(k)) map.set(k, { events: [], exams: [], appointments: [] });
      return map.get(k)!;
    };
    for (const e of events()) {
      if (!e.starts_at) continue;
      bucket(dateKey(new Date(e.starts_at))).events.push(e);
    }
    for (const e of exams()) {
      if (!e.starts_at || e.draft) continue;
      bucket(dateKey(new Date(e.starts_at))).exams.push(e);
    }
    for (const a of appointments()) {
      if (!a.starts_at || (a.status !== "pending" && a.status !== "approved")) continue;
      bucket(dateKey(new Date(a.starts_at))).appointments.push(a);
    }
    return map;
  });

  const selectedKey = () => selected();
  const selectedDay = () => {
    const [y, m, d] = selected().split("-").map(Number);
    return new Date(y, m, d);
  };
  const selectedItems = () => itemsByDay().get(selectedKey()) ?? { events: [], exams: [], appointments: [] };
  const isToday = (day: number) => {
    const n = nowDate();
    return n.getFullYear() === viewYear() && n.getMonth() === viewMonth() && n.getDate() === day;
  };

  const goToday = () => {
    const n = nowDate();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelected(dateKey(n));
  };
  const prevMonth = () => {
    const m = viewMonth();
    if (m === 0) { setViewYear((y: number) => y - 1); setViewMonth(11); }
    else setViewMonth(m - 1);
  };
  const nextMonth = () => {
    const m = viewMonth();
    if (m === 11) { setViewYear((y: number) => y + 1); setViewMonth(0); }
    else setViewMonth(m + 1);
  };

  return (
    <div class="space-y-4">
      <section class="data-shell space-y-3 border-sky-500/15 bg-sky-500/2.5 p-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="truncate text-xl font-semibold tracking-tight text-foreground">{t("calendar.title")}</h1>
            <div class="mt-1.5 flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" class="h-8 w-8 rounded-lg p-0" onClick={prevMonth}>
                <IconChevronLeft class="h-4 w-4" />
              </Button>
              <span class="text-base font-semibold tracking-tight">{monthLabel()}</span>
              <Button type="button" variant="ghost" size="sm" class="h-8 w-8 rounded-lg p-0" onClick={nextMonth}>
                <IconChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Link
              to="/appointments"
              class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-semibold outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconClock class="h-3.5 w-3.5" />
              {t("nav.appointments")}
            </Link>
            <Button type="button" variant="outline" size="sm" class="h-9 rounded-lg gap-1 text-sm font-semibold" onClick={goToday}>
              <IconCalendarDays class="h-3.5 w-3.5" />
              {t("calendar.today")}
            </Button>
          </div>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="rounded-lg border bg-card shadow-xs">
              <div class="grid grid-cols-7 border-b">
                <For each={dayNames()}>
                  {(name) => (
                    <div class="border-r border-border/40 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0">
                      {name}
                    </div>
                  )}
                </For>
              </div>
              <div class="grid grid-cols-7">
                <For each={grid()}>
                  {(cell) => {
                    const key = cell.other ? "" : dateKey(new Date(viewYear(), viewMonth(), cell.day));
                    const items = () => cell.other ? null : itemsByDay().get(key);
                    const cellToday = !cell.other && isToday(cell.day);
                    const cellSelected = () => !cell.other && key === selectedKey();
                    return (
                      <button
                        type="button"
                        class={cn(
                          "relative flex min-h-17 flex-col border-b border-r border-border/40 p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/40 xl:min-h-21 2xl:min-h-24",
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
                        <Show when={items()}>
                          {(dayItems) => (
                            <div class="mt-1 flex min-h-0 flex-1 flex-col justify-end gap-0.5 overflow-hidden">
                              <Show when={dayItems().events[0]}>
                                {(event) => (
                                  <span class="inline-flex min-w-0 items-center gap-1 rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium leading-none text-emerald-700 dark:border dark:border-emerald-800/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                    <span class="truncate">{event().title}</span>
                                    <Show when={dayItems().events.length > 1}>
                                      <span class="shrink-0 opacity-70">+{dayItems().events.length - 1}</span>
                                    </Show>
                                  </span>
                                )}
                              </Show>
                              <Show when={dayItems().exams[0]}>
                                {(exam) => (
                                  <span class="inline-flex min-w-0 items-center gap-1 rounded bg-rose-100 px-1 py-0.5 text-[9px] font-medium leading-none text-rose-700 dark:border dark:border-rose-800/50 dark:bg-rose-950/60 dark:text-rose-300">
                                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                    <span class="truncate">{exam().title}</span>
                                    <Show when={dayItems().exams.length > 1}>
                                      <span class="shrink-0 opacity-70">+{dayItems().exams.length - 1}</span>
                                    </Show>
                                  </span>
                                )}
                              </Show>
                              <Show when={dayItems().appointments[0]}>
                                {(appt) => (
                                  <span class="inline-flex min-w-0 items-center gap-1 rounded bg-violet-100 px-1 py-0.5 text-[9px] font-medium leading-none text-violet-700 dark:border dark:border-violet-800/50 dark:bg-violet-950/60 dark:text-violet-300">
                                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                                    <span class="truncate">{counterpart(appt())}</span>
                                    <Show when={dayItems().appointments.length > 1}>
                                      <span class="shrink-0 opacity-70">+{dayItems().appointments.length - 1}</span>
                                    </Show>
                                  </span>
                                )}
                              </Show>
                            </div>
                          )}
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
                <h3 class="text-sm font-semibold">
                  {selectedDay().toLocaleDateString(locale() === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}
                </h3>

                <div class="mt-2 space-y-2.5">
                  <Show when={selectedItems().events.length === 0 && selectedItems().exams.length === 0 && selectedItems().appointments.length === 0}>
                    <p class="text-xs text-muted-foreground">{t("calendar.noEvents")}</p>
                  </Show>

                  <Show when={selectedItems().events.length > 0}>
                    <div class="space-y-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">{t("calendar.events")}</p>
                      <For each={selectedItems().events}>
                        {(ev) => (
                          <a
                            href={`/events/${ev.id}`}
                            class="group flex items-start justify-between gap-2 rounded-lg border border-emerald-500/40 bg-card p-2.5 shadow-xs transition-all hover:border-emerald-500/70 hover:shadow-md dark:border-emerald-500/30 dark:hover:border-emerald-500/70"
                          >
                            <div class="min-w-0">
                              <p class="truncate text-xs font-semibold group-hover:text-emerald-500">{ev.title}</p>
                              <p class="mt-0.5 text-[11px] text-muted-foreground">
                                {ev.starts_at ? new Date(ev.starts_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                                {ev.ends_at ? ` — ${new Date(ev.ends_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" class="shrink-0 text-[10px]">{t("calendar.events")}</Badge>
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={selectedItems().exams.length > 0}>
                    <div class="space-y-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-rose-500">{t("calendar.exams")}</p>
                      <For each={selectedItems().exams}>
                        {(exam) => (
                          <a
                            href={`/exams/${exam.id}`}
                            class="group flex items-start justify-between gap-2 rounded-lg border border-rose-500/40 bg-card p-2.5 shadow-xs transition-all hover:border-rose-500/70 hover:shadow-md dark:border-rose-500/30 dark:hover:border-rose-500/70"
                          >
                            <div class="min-w-0">
                              <p class="truncate text-xs font-semibold group-hover:text-rose-500">{exam.title}</p>
                              <p class="mt-0.5 text-[11px] text-muted-foreground">
                                {exam.starts_at ? new Date(exam.starts_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                                {exam.ends_at ? ` — ${new Date(exam.ends_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" class="shrink-0 text-[10px]">{t("calendar.exams")}</Badge>
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>

                  <Show when={selectedItems().appointments.length > 0}>
                    <div class="space-y-2">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-violet-500">{t("calendar.appointments")}</p>
                      <For each={selectedItems().appointments}>
                        {(appt) => (
                          <a
                            href="/appointments"
                            class="group flex items-start justify-between gap-2 rounded-lg border border-violet-500/40 bg-card p-2.5 shadow-xs transition-all hover:border-violet-500/70 hover:shadow-md dark:border-violet-500/30 dark:hover:border-violet-500/70"
                          >
                            <div class="min-w-0">
                              <p class="truncate text-xs font-semibold group-hover:text-violet-500">{counterpart(appt)}</p>
                              <p class="mt-0.5 text-[11px] text-muted-foreground">
                                {appt.starts_at ? new Date(appt.starts_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                                {appt.ends_at ? ` — ${new Date(appt.ends_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" class={cn("shrink-0 gap-1 text-[10px]", appointmentStatusClass(appt.status))}>
                              <span class={cn("h-1.5 w-1.5 rounded-full", appointmentStatusDotClass(appt.status))} />
                              {t(appointmentStatusLabelKey(appt.status))}
                            </Badge>
                          </a>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </Suspense>
      </section>
    </div>
  );
}
