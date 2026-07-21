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
import { IconClock } from "@/components/ui/icons";
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
        actions={
          <Show
            when={running()}
            fallback={
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" disabled={pending()} onClick={() => void run(postPomodoroStart, t("pomodoro.started"))}>
                {t("pomodoro.start")}
              </Button>
            }
          >
            <Button type="button" size="sm" variant="outline" class="min-w-[7.5rem] rounded-lg" disabled={pending()} onClick={() => void run(postPomodoroFinish, t("pomodoro.finished"))}>
              {t("pomodoro.finish")}
            </Button>
          </Show>
        }
      />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="grid gap-3 sm:grid-cols-2">
        <Show
          when={running()}
          fallback={
            <div class="detail-metric-card">
              <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.total")}</p>
              <p class="mono mt-2 text-3xl font-semibold tabular-nums">{formatDurationClock(log()?.total_focus_ms)}</p>
            </div>
          }
        >
          <div class="detail-metric-card overflow-hidden border-emerald-500/25 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_38%)]">
            <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span class="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <IconClock class="h-3.5 w-3.5" />
              </span>
              {t("pomodoro.running")}
            </div>
            <p class="mono mt-4 text-5xl font-semibold leading-none tracking-tight tabular-nums sm:text-6xl">{formatDurationClock(runningDuration())}</p>
          </div>
        </Show>
        <div class="detail-metric-card">
          <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("attempt.status")}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={running() ? "default" : "secondary"} class="rounded-md px-3 py-1 text-sm">
              {running() ? t("pomodoro.running") : t("pomodoro.idle")}
            </Badge>
          </div>
        </div>
      </section>

      <section class="data-shell space-y-4 p-4">
        <h2 class="font-display text-lg font-semibold">{t("pomodoro.history")}</h2>
        <Suspense fallback={<PageSpinner />}>
          <DataTable columns={columns()} data={log()?.items ?? []} empty={t("pomodoro.empty")} enablePagination pageSize={10} />
        </Suspense>
      </section>
    </div>
  );
}
