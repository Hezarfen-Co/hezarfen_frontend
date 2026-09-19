import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getPomodoroMe } from "@/api/pomodoro";
import { getLimits } from "@/api/limits";
import { postPomodoroFinish } from "@/api/pomodoro";
import { postPomodoroStart } from "@/api/pomodoro";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconCheck, IconClock } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFlash } from "@/lib/flash";
import { createNow } from "@/lib/create-now";
import { triggerConfetti } from "@/lib/confetti";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const DURATION_KEY = "hezarfen.pomodoro.targetMinutes";
const PRESET_MINUTES = [15, 25, 45, 60];
const DEFAULT_MINUTES = 25;
const MAX_MINUTES = 180;

function readTargetMinutes(): number {
  try {
    const saved = Number(localStorage.getItem(DURATION_KEY));
    return Number.isFinite(saved) && saved > 0 && saved <= MAX_MINUTES ? saved : DEFAULT_MINUTES;
  } catch {
    return DEFAULT_MINUTES;
  }
}

export default function PomodoroPage() {
  return (
    <RouteGuard exactRole="student">
      <PomodoroContent />
    </RouteGuard>
  );
}

function PomodoroContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();
  const now = createNow(1000);
  const [log, { refetch }] = createResource(() => getPomodoroMe({ limit: 20 }));
  const [limits] = createResource(() => getLimits().catch(() => null));
  const [focusLabel, setFocusLabel] = createSignal("");
  const running = createMemo(() => log()?.items.find((item) => item.finished_at == null) ?? null);
  const runningDuration = createMemo(() => {
    const current = running();
    return current ? now() - current.started_at : null;
  });

  // Pomodoro-style countdown: purely a client-side display target — the
  // backend session is still just an open-ended start/finish stopwatch, so
  // this only changes what the clock shows, not what gets recorded.
  const [targetMinutes, setTargetMinutes] = createSignal(readTargetMinutes());
  createEffect(() => {
    try {
      localStorage.setItem(DURATION_KEY, String(targetMinutes()));
    } catch {
      // Duration just won't be remembered next visit.
    }
  });
  const targetMs = () => targetMinutes() * 60_000;
  const remainingMs = createMemo(() => {
    const dur = runningDuration();
    return dur == null ? null : Math.max(0, targetMs() - dur);
  });
  const overtimeMs = createMemo(() => {
    const dur = runningDuration();
    return dur == null ? 0 : Math.max(0, dur - targetMs());
  });
  const isOvertime = () => overtimeMs() > 0;

  // One flash when the countdown crosses zero, not one per tick.
  const [targetNotified, setTargetNotified] = createSignal(false);
  createEffect(() => {
    if (!running()) {
      setTargetNotified(false);
      return;
    }
    if (isOvertime() && !targetNotified()) {
      setTargetNotified(true);
      setFlash(t("pomodoro.targetReached"));
    }
  });
  const finishedSessions = createMemo(() => (log()?.items ?? []).filter((item) => item.finished_at != null));
  const todayFocus = createMemo(() => {
    const start = new Date(now());
    start.setHours(0, 0, 0, 0);
    const startMs = start.getTime();
    return finishedSessions().reduce((total, item) => item.started_at >= startMs ? total + (item.duration_ms ?? 0) : total, 0);
  });
  const averageFocus = createMemo(() => {
    const items = finishedSessions();
    if (items.length === 0) return null;
    return Math.round(items.reduce((total, item) => total + (item.duration_ms ?? 0), 0) / items.length);
  });
  const lastFinished = createMemo(() => finishedSessions()[0]?.finished_at ?? null);
  const columns = createMemo<ColumnDef<NonNullable<ReturnType<typeof log>>["items"][number]>[]>(() => [
    {
      accessorKey: "label",
      header: t("pomodoro.sessionLabel"),
      cell: (cell) => <span class="font-medium">{cell.row.original.label || "—"}</span>,
    },
    {
      accessorKey: "started_at",
      header: t("pomodoro.startedAt"),
      cell: (cell) => <span class="whitespace-nowrap">{formatDateTime(cell.row.original.started_at, locale())}</span>,
    },
    {
      accessorKey: "finished_at",
      header: t("pomodoro.finishedAt"),
      cell: (cell) => <span class="whitespace-nowrap">{formatDateTime(cell.row.original.finished_at, locale())}</span>,
    },
    {
      accessorKey: "duration_ms",
      header: t("pomodoro.duration"),
      cell: (cell) => <span class="tabular-nums">{formatDurationClock(cell.row.original.duration_ms)}</span>,
    },
    {
      accessorKey: "counted",
      header: t("pomodoro.counted"),
      cell: (cell) => (
        <Badge variant={cell.row.original.counted ? "default" : "secondary"}>
          {cell.row.original.counted == null
            ? "—"
            : cell.row.original.counted
              ? t("pomodoro.countedYes")
              : t("pomodoro.countedNo")}
        </Badge>
      ),
    },
  ]);

  const startFocus = async () => {
    const label = focusLabel().trim();
    await postPomodoroStart(label ? { label } : undefined);
    setFocusLabel("");
  };

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setError("");
    setPending(true);
    try {
      await action();
      await refetch();
      setFlash(ok);
      if (action === postPomodoroFinish) {
        triggerConfetti();
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const progressPercent = createMemo(() => {
    const dur = runningDuration();
    if (!dur) return 0;
    return Math.min(1, dur / targetMs());
  });

  const dashOffset = createMemo(() => {
    const circumference = 339.29; // 2 * pi * 54
    return circumference * (1 - progressPercent());
  });

  return (
    <div class="space-y-6">
      <PageHeader
        title={t("pomodoro.title")}
        description={t("pomodoro.subtitle")}
      />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
                <IconClock class="h-5 w-5" />
              </span>
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("pomodoro.focusConsole")}</p>
                <p class="mt-1 truncate text-sm text-muted-foreground">
                  <Show when={running()} fallback={t("pomodoro.idleHelp")}>
                    {(session) => t("pomodoro.runningSince", { time: formatDateTime(session().started_at, locale()) })}
                  </Show>
                </p>
              </div>
            </div>
            <Badge variant={running() ? "default" : "secondary"} class="rounded-lg px-3 py-1 text-sm">
              {running() ? t("pomodoro.running") : t("pomodoro.idle")}
            </Badge>
          </div>

          <div class="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div class="flex flex-col sm:flex-row items-center gap-6">
              <div class="relative flex h-36 w-36 shrink-0 items-center justify-center">
                <svg class="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" class="stroke-muted/40" stroke-width="8" fill="none" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    class={cn("stroke-primary transition-all duration-1000 ease-linear", running() && "animate-pulse-glow")}
                    stroke-width="8"
                    stroke-dasharray="339.29"
                    stroke-dashoffset={running() ? dashOffset() : 0}
                    stroke-linecap="round"
                    fill="none"
                  />
                </svg>
                <span class="absolute text-center">
                  <IconClock class={cn("h-7 w-7 mx-auto text-primary-text", running() && "animate-pulse")} />
                </span>
              </div>

              <div>
                <p class={cn("text-xs font-medium uppercase tracking-[0.08em]", running() && isOvertime() ? "text-destructive-text" : "text-muted-foreground")}>
                  {running() ? (isOvertime() ? t("pomodoro.overtime") : t("pomodoro.remaining")) : t("pomodoro.total")}
                </p>
                <p class={cn("mt-2 text-5xl font-semibold leading-none tracking-tight tabular-nums sm:text-6xl", running() && isOvertime() && "text-destructive-text")}>
                  {running() && isOvertime() && "+"}
                  {formatDurationClock(running() ? (isOvertime() ? overtimeMs() : remainingMs()) : log()?.total_focus_ms)}
                </p>
              </div>
            </div>

            <div class="flex flex-col items-center gap-3 md:items-end">
              <Show when={!running()}>
                <div class="w-full min-w-48 space-y-1.5">
                  <Label for="pomodoro-label">{t("pomodoro.sessionLabel")}</Label>
                  <Input
                    id="pomodoro-label"
                    class="h-9 rounded-lg"
                    maxlength={limits()?.pomodoro.max_label_len}
                    placeholder={t("pomodoro.sessionLabelPlaceholder")}
                    value={focusLabel()}
                    onInput={(event) => setFocusLabel(event.currentTarget.value)}
                  />
                </div>
              </Show>
              <Show
                when={running()}
                fallback={
                  <Button type="button" size="sm" class="h-10 min-w-40 rounded-md text-base" disabled={pending()} onClick={() => void run(startFocus, t("pomodoro.started"))}>
                    <IconClock class="h-4 w-4" />
                    {t("pomodoro.start")}
                  </Button>
                }
              >
                <Button type="button" size="sm" variant="outline" class="h-10 min-w-40 rounded-md text-base" disabled={pending()} onClick={() => void run(postPomodoroFinish, t("pomodoro.finished"))}>
                  <IconCheck class="h-4 w-4" />
                  {t("pomodoro.finish")}
                </Button>
              </Show>

              {/* Session length: like the classic Pomodoro technique, this is
                  configurable — locked once a session is running so it can't
                  drift mid-focus. */}
              <div class="flex flex-wrap items-center justify-center gap-1.5 md:justify-end">
                <For each={PRESET_MINUTES}>
                  {(minutes) => (
                    <Button
                      type="button"
                      size="sm"
                      variant={targetMinutes() === minutes ? "default" : "outline"}
                      class="h-7 min-w-11 rounded-lg px-2 text-xs"
                      disabled={!!running()}
                      onClick={() => setTargetMinutes(minutes)}
                    >
                      {minutes}
                    </Button>
                  )}
                </For>
                <Input
                  type="number"
                  min="1"
                  max={MAX_MINUTES}
                  value={targetMinutes()}
                  disabled={!!running()}
                  class="h-7 w-16 rounded-lg px-2 text-xs"
                  title={t("pomodoro.customMinutes")}
                  onInput={(event) => {
                    const value = Number(event.currentTarget.value);
                    if (Number.isFinite(value) && value > 0 && value <= MAX_MINUTES) setTargetMinutes(value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.today")}</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums">{formatDurationClock(todayFocus())}</p>
          </div>
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.average")}</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums">{formatDurationClock(averageFocus())}</p>
          </div>
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.sessions")}</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums">{log()?.total ?? 0}</p>
          </div>
        </div>
      </section>

      <section class="space-y-4 p-0">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="text-lg font-semibold">{t("pomodoro.history")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              <Show when={lastFinished()} fallback={t("pomodoro.noRecentSession")}>
                {(at) => t("pomodoro.lastSession", { time: formatDateTime(at(), locale()) })}
              </Show>
            </p>
          </div>
        </div>
        <Suspense fallback={<DataTableSkeleton />}>
          <DataTable columns={columns()} data={log()?.items ?? []} empty={t("pomodoro.empty")} enablePagination pageSize={10} />
        </Suspense>
      </section>
    </div>
  );
}
