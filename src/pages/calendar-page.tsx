import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getEvents } from "@/api/events";
import { getExams } from "@/api/exams";
import type { Event, Exam } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/page-spinner";
import { IconCalendarDays, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_SHORT_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
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
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const nowDate = () => new Date(now());
  const [viewYear, setViewYear] = createSignal(nowDate().getFullYear());
  const [viewMonth, setViewMonth] = createSignal(nowDate().getMonth());
  const [selected, setSelected] = createSignal(dateKey(nowDate()));

  const [events] = createResource(async () => (await getEvents({ limit: 100 })).items, { initialValue: [] });
  const [exams] = createResource(async () => (await getExams({ limit: 100 })).items, { initialValue: [] });

  const monthLabel = () => {
    const names = locale() === "tr" ? MONTH_NAMES_TR : MONTH_NAMES;
    return `${names[viewMonth()]} ${viewYear()}`;
  };
  const dayNames = () => locale() === "tr" ? DAY_NAMES_SHORT_TR : DAY_NAMES_SHORT;
  const firstDay = () => new Date(viewYear(), viewMonth(), 1).getDay();
  const daysInMonth = () => new Date(viewYear(), viewMonth() + 1, 0).getDate();

  const grid = createMemo(() => {
    const cells: { day: number; other: boolean }[] = [];
    for (let i = 0; i < firstDay(); i++) cells.push({ day: 0, other: true });
    for (let d = 1; d <= daysInMonth(); d++) cells.push({ day: d, other: false });
    return cells;
  });

  const itemsByDay = createMemo(() => {
    const map = new Map<string, { events: Event[]; exams: Exam[] }>();
    for (const e of events()) {
      if (!e.starts_at) continue;
      const k = dateKey(new Date(e.starts_at));
      if (!map.has(k)) map.set(k, { events: [], exams: [] });
      map.get(k)!.events.push(e);
    }
    for (const e of exams()) {
      if (!e.starts_at || e.draft) continue;
      const k = dateKey(new Date(e.starts_at));
      if (!map.has(k)) map.set(k, { events: [], exams: [] });
      map.get(k)!.exams.push(e);
    }
    return map;
  });

  const selectedKey = () => selected();
  const selectedDay = () => {
    const [y, m, d] = selected().split("-").map(Number);
    return new Date(y, m, d);
  };
  const selectedItems = () => itemsByDay().get(selectedKey()) ?? { events: [], exams: [] };
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
    <div class="space-y-6">
      <PageHeader
        title={t("calendar.title")}
        accent="sky"
        actions={
          <div class="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" class="h-8 gap-1 text-xs font-semibold" onClick={goToday}>
              <IconCalendarDays class="h-3.5 w-3.5" />
              {t("calendar.today")}
            </Button>
          </div>
        }
      >
        <div class="mt-2 flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" onClick={prevMonth}>
            <IconChevronLeft class="h-4 w-4" />
          </Button>
          <span class="font-display text-lg font-semibold tracking-tight">{monthLabel()}</span>
          <Button type="button" variant="ghost" size="sm" class="h-7 w-7 p-0" onClick={nextMonth}>
            <IconChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <Suspense fallback={<PageSpinner />}>
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div class="rounded-lg border bg-card shadow-sm">
            <div class="grid grid-cols-7 border-b">
              <For each={dayNames()}>
                {(name) => (
                  <div class="border-r border-border/40 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0">
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
                        "relative flex min-h-[4.5rem] flex-col border-b border-r border-border/40 p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/40 xl:min-h-28 2xl:min-h-32",
                        cell.other && "pointer-events-none bg-muted/20",
                        cellSelected() ? "bg-sky-50/60 ring-1 ring-inset ring-sky-400/50 dark:bg-sky-950/40 dark:ring-sky-500/40" : "",
                      )}
                      disabled={cell.other}
                      onClick={() => key && setSelected(key)}
                    >
                      <span
                        class={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          cellToday ? "bg-primary text-primary-foreground font-semibold" : "",
                          cell.other ? "text-muted-foreground/30" : "text-foreground",
                        )}
                      >
                        {cell.day || ""}
                      </span>
                      <Show when={items()}>
                        {(dayItems) => (
                        <div class="mt-1 flex min-h-0 flex-1 flex-col justify-end gap-1 overflow-hidden">
                          {/* ponytail: month cells show one badge per type; selected list has full detail. */}
                          <Show when={dayItems().events[0]}>
                            {(event) => (
                              <span class="inline-flex min-w-0 items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950/60 dark:border dark:border-emerald-800/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-emerald-700 dark:text-emerald-300">
                                <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span class="truncate">{event().title}</span>
                                <Show when={dayItems().events.length > 1}>
                                  <span class="shrink-0 text-emerald-600 dark:text-emerald-400">+{dayItems().events.length - 1}</span>
                                </Show>
                              </span>
                            )}
                          </Show>
                          <Show when={dayItems().exams[0]}>
                            {(exam) => (
                              <span class="inline-flex min-w-0 items-center gap-1 rounded bg-rose-100 dark:bg-rose-950/60 dark:border dark:border-rose-800/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-rose-700 dark:text-rose-300">
                                <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                <span class="truncate">{exam().title}</span>
                                <Show when={dayItems().exams.length > 1}>
                                  <span class="shrink-0 text-rose-600 dark:text-rose-400">+{dayItems().exams.length - 1}</span>
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

          <div class="space-y-3 xl:sticky xl:top-20 xl:self-start">
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                {t("calendar.events")}
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-flex h-2 w-2 rounded-full bg-rose-500" />
                {t("calendar.exams")}
              </span>
            </div>

            <Show
              when={selectedItems().events.length > 0 || selectedItems().exams.length > 0}
              fallback={
                <EmptyState title={t("calendar.noEvents")} />
              }
            >
              <div class="space-y-2">
                <p class="text-xs font-semibold text-muted-foreground">
                  {selectedDay().toLocaleDateString(locale() === "tr" ? "tr-TR" : "en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <For each={selectedItems().events}>
                  {(event) => (
                    <a href={`/events/${event.id}`} class="flex items-start gap-3 rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3 transition-colors hover:bg-emerald-100/50 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40">
                      <span class="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-foreground">{event.title}</p>
                        <p class="text-xs text-muted-foreground">
                          {event.starts_at ? new Date(event.starts_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                          {event.ends_at ? ` — ${new Date(event.ends_at).toLocaleTimeString(locale() === "tr" ? "tr-TR" : "en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" class="shrink-0 text-[10px]">{t("calendar.events")}</Badge>
                    </a>
                  )}
                </For>
                <For each={selectedItems().exams}>
                  {(exam) => (
                    <a href={`/exams/${exam.id}`} class="flex items-start gap-3 rounded-lg border border-rose-200/60 bg-rose-50/50 p-3 transition-colors hover:bg-rose-100/50 dark:border-rose-800/50 dark:bg-rose-950/30 dark:hover:bg-rose-900/40">
                      <span class="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-foreground">{exam.title}</p>
                        <p class="text-xs text-muted-foreground">
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
          </div>
        </div>
      </Suspense>
    </div>
  );
}
