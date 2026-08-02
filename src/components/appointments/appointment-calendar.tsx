import { For, Show, createMemo, createSignal } from "solid-js";
import type { Appointment } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCalendarDays, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { appointmentStatusClass, appointmentStatusDotClass, appointmentStatusLabelKey } from "@/lib/appointment-status";
import { cn } from "@/lib/cn";
import { appointmentCounterpart } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function AppointmentCalendar(props: {
  appointments: Appointment[];
  userId?: string;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const today = new Date();
  const [view, setView] = createSignal(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = createSignal(dateKey(today));
  const localeCode = () => locale() === "tr" ? "tr-TR" : "en-US";
  const activeAppointments = createMemo(() =>
    props.appointments.filter((appointment) =>
      appointment.starts_at != null &&
      (appointment.status === "pending" || appointment.status === "approved")
    )
  );
  const appointmentsByDay = createMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of activeAppointments()) {
      const key = dateKey(new Date(appointment.starts_at!));
      map.set(key, [...(map.get(key) ?? []), appointment]);
    }
    return map;
  });
  const cells = createMemo(() => {
    const first = view();
    const offset = first.getDay();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(first.getFullYear(), first.getMonth(), index - offset + 1);
      return { date, current: date.getMonth() === first.getMonth() };
    });
  });
  const selectedAppointments = () => appointmentsByDay().get(selected()) ?? [];
  const monthLabel = () => new Intl.DateTimeFormat(localeCode(), { month: "long", year: "numeric" }).format(view());
  const weekdayLabels = () => Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(localeCode(), { weekday: "short" }).format(new Date(2026, 7, 2 + day))
  );
  const moveMonth = (offset: number) => {
    const next = new Date(view().getFullYear(), view().getMonth() + offset, 1);
    setView(next);
    setSelected(dateKey(next));
  };
  const goToday = () => {
    const next = new Date();
    setView(new Date(next.getFullYear(), next.getMonth(), 1));
    setSelected(dateKey(next));
  };

  return (
    <section class="rounded-lg border border-border bg-card p-4 shadow-xs">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 class="text-lg font-semibold">{t("appointments.calendar")}</h2>
          <p class="mt-0.5 text-sm text-muted-foreground">{monthLabel()}</p>
        </div>
        <div class="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" class="h-9 w-9 rounded-lg p-0" onClick={() => moveMonth(-1)} aria-label={t("common.prev")}>
            <IconChevronLeft class="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" class="h-9 rounded-lg" onClick={goToday}>
            <IconCalendarDays class="h-4 w-4" />
            {t("calendar.today")}
          </Button>
          <Button type="button" variant="ghost" size="sm" class="h-9 w-9 rounded-lg p-0" onClick={() => moveMonth(1)} aria-label={t("common.next")}>
            <IconChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div class="overflow-hidden rounded-xl border border-border">
          <div class="grid grid-cols-7 border-b border-border bg-muted/35">
            <For each={weekdayLabels()}>
              {(label) => <div class="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>}
            </For>
          </div>
          <div class="grid grid-cols-7">
            <For each={cells()}>
              {(cell) => {
                const key = () => dateKey(cell.date);
                const appointments = () => appointmentsByDay().get(key()) ?? [];
                const isToday = () => key() === dateKey(today);
                return (
                  <button
                    type="button"
                    aria-label={cell.date.toLocaleDateString(localeCode())}
                    aria-pressed={selected() === key()}
                    class={cn(
                      "relative min-h-16 border-b border-r border-border/60 p-1.5 text-left outline-hidden transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-20",
                      !cell.current && "bg-muted/15 text-muted-foreground/50",
                      selected() === key() && "bg-primary/8 ring-1 ring-inset ring-primary/30",
                    )}
                    onClick={() => setSelected(key())}
                  >
                    <span class={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isToday() && "bg-primary font-semibold text-primary-foreground")}>
                      {cell.date.getDate()}
                    </span>
                    <Show when={appointments().length > 0}>
                      <span class="mt-1 flex items-center gap-1">
                        <span class="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        <span class="text-[10px] font-semibold text-violet-600 dark:text-violet-300">{appointments().length}</span>
                      </span>
                    </Show>
                  </button>
                );
              }}
            </For>
          </div>
        </div>

        <aside class="rounded-xl border border-border bg-muted/20 p-3">
          <h3 class="text-sm font-semibold">
            {new Date(selected().split("-").map(Number)[0]!, selected().split("-").map(Number)[1]!, selected().split("-").map(Number)[2]!)
              .toLocaleDateString(localeCode(), { day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <div class="mt-3 space-y-2">
            <Show when={selectedAppointments().length > 0} fallback={<p class="py-6 text-center text-xs text-muted-foreground">{t("appointments.empty")}</p>}>
              <For each={selectedAppointments()}>
                {(appointment) => (
                  <article class="rounded-lg border border-border bg-card p-3">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold">{appointmentCounterpart(appointment, props.userId)}</p>
                        <p class="mt-0.5 text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat(localeCode(), { hour: "2-digit", minute: "2-digit" }).format(new Date(appointment.starts_at!))}
                          {" – "}
                          {appointment.ends_at == null ? "—" : new Intl.DateTimeFormat(localeCode(), { hour: "2-digit", minute: "2-digit" }).format(new Date(appointment.ends_at))}
                        </p>
                      </div>
                      <Badge variant="outline" class={cn("shrink-0 rounded-full text-[10px]", appointmentStatusClass(appointment.status))}>
                        <span class={cn("mr-1 h-1.5 w-1.5 rounded-full", appointmentStatusDotClass(appointment.status))} />
                        {t(appointmentStatusLabelKey(appointment.status))}
                      </Badge>
                    </div>
                  </article>
                )}
              </For>
            </Show>
          </div>
        </aside>
      </div>
    </section>
  );
}
