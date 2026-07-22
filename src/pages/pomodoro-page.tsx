import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getPomodoroMe } from "@/api/pomodoro";
import { postPomodoroFinish } from "@/api/pomodoro";
import { postPomodoroStart } from "@/api/pomodoro";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { IconCheck, IconClock } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { createNow } from "@/lib/create-now";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  const running = createMemo(() => log()?.items.find((item) => item.finished_at == null) ?? null);
  const runningDuration = createMemo(() => {
    const current = running();
    return current ? now() - current.started_at : null;
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
      accessorKey: "started_at",
      header: t("pomodoro.startedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.started_at, locale())}</span>,
    },
    {
      accessorKey: "finished_at",
      header: t("pomodoro.finishedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.finished_at, locale())}</span>,
    },
    {
      accessorKey: "duration_ms",
      header: t("pomodoro.duration"),
      cell: (cell) => <span class="mono tabular-nums">{formatDurationClock(cell.row.original.duration_ms)}</span>,
    },
  ]);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    setError("");
    setPending(true);
    try {
      await action();
      await refetch();
      setFlash(ok);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader
        accent="mint"
        eyebrow={t("nav.pomodoro")}
        title={t("pomodoro.title")}
        description={t("pomodoro.subtitle")}
      />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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

          <div class="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{running() ? t("pomodoro.current") : t("pomodoro.total")}</p>
              <p class="mono mt-3 text-6xl font-semibold leading-none tracking-tight tabular-nums sm:text-7xl">
                {formatDurationClock(running() ? runningDuration() : log()?.total_focus_ms)}
              </p>
            </div>
            <Show
              when={running()}
              fallback={
                <Button type="button" size="sm" class="h-12 min-w-[10rem] rounded-xl text-base" disabled={pending()} onClick={() => void run(postPomodoroStart, t("pomodoro.started"))}>
                  <IconClock class="h-4 w-4" />
                  {t("pomodoro.start")}
                </Button>
              }
            >
              <Button type="button" size="sm" variant="outline" class="h-12 min-w-[10rem] rounded-xl text-base" disabled={pending()} onClick={() => void run(postPomodoroFinish, t("pomodoro.finished"))}>
                <IconCheck class="h-4 w-4" />
                {t("pomodoro.finish")}
              </Button>
            </Show>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.today")}</p>
            <p class="mono mt-2 text-2xl font-semibold tabular-nums">{formatDurationClock(todayFocus())}</p>
          </div>
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.average")}</p>
            <p class="mono mt-2 text-2xl font-semibold tabular-nums">{formatDurationClock(averageFocus())}</p>
          </div>
          <div class="detail-metric-card">
            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.sessions")}</p>
            <p class="mono mt-2 text-2xl font-semibold tabular-nums">{log()?.total ?? 0}</p>
          </div>
        </div>
      </section>

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("pomodoro.history")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              <Show when={lastFinished()} fallback={t("pomodoro.noRecentSession")}>
                {(at) => t("pomodoro.lastSession", { time: formatDateTime(at(), locale()) })}
              </Show>
            </p>
          </div>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <DataTable columns={columns()} data={log()?.items ?? []} empty={t("pomodoro.empty")} enablePagination pageSize={10} />
        </Suspense>
      </section>
    </div>
  );
}
