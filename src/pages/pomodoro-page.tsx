import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getPomodoroMe } from "@/api/getPomodoroMe";
import { postPomodoroFinish } from "@/api/postPomodoroFinish";
import { postPomodoroStart } from "@/api/postPomodoroStart";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
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
  const [log, { refetch }] = createResource(() => getPomodoroMe({ limit: 20 }));
  const running = createMemo(() => log()?.items.find((item) => item.finished_at == null) ?? null);
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
      cell: (cell) => formatDurationMinutes(cell.row.original.duration_ms, locale()),
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
        <div class="detail-metric-card">
          <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.total")}</p>
          <p class="mono mt-2 text-3xl font-semibold tabular-nums">{formatDurationMinutes(log()?.total_focus_ms, locale())}</p>
        </div>
        <div class="detail-metric-card">
          <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("attempt.status")}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={running() ? "default" : "secondary"} class="rounded-sm">
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
