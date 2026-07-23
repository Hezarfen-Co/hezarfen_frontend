import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getMyWorkLog } from "@/api/work";
import { postWorkCheckIn } from "@/api/work";
import { postWorkCheckOut } from "@/api/work";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";
import type { WorkEntry } from "@/api/client";

const WORK_PAGE_SIZE = 15;

export default function WorkLogPage() {
  return (
    <RouteGuard minRole="teacher" maxRole="manager">
      <WorkLogContent />
    </RouteGuard>
  );
}

function WorkLogContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const [version, setVersion] = createSignal(0);

  const [openProbe, { refetch: refetchOpen }] = createResource(
    () => version(),
    async () => (await getMyWorkLog({ limit: 1, offset: 0 })).items,
  );
  const openEntry = createMemo(() => (openProbe() ?? []).find((entry) => entry.check_out == null) ?? null);

  const [list, { refetch }] = createResource(
    () => version(),
    async () => getMyWorkLog(),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const columns = createMemo<ColumnDef<WorkEntry>[]>(() => [
    {
      accessorKey: "check_in",
      header: t("work.checkIn"),
      cell: (cell) => <span class="mono">{formatDateTime(cell.row.original.check_in, locale())}</span>,
    },
    {
      accessorKey: "check_out",
      header: t("work.checkOut"),
      cell: (cell) => <span class="mono">{formatDateTime(cell.row.original.check_out, locale())}</span>,
    },
    {
      accessorKey: "duration_ms",
      header: t("work.duration"),
      cell: (cell) => <span class="mono">{formatDurationMinutes(cell.row.original.duration_ms, locale())}</span>,
    },
    {
      id: "status",
      header: t("work.status"),
      cell: (cell) => (
        <Badge variant={cell.row.original.check_out == null ? "default" : "secondary"} class="rounded-sm">
          {cell.row.original.check_out == null ? t("work.open") : t("work.closed")}
        </Badge>
      ),
    },
  ]);

  const toggle = async () => {
    setError("");
    setPending(true);
    try {
      if (openEntry()) {
        await postWorkCheckOut();
        setFlash(t("common.saved"));
      } else {
        await postWorkCheckIn();
        setFlash(t("common.saved"));
      }
      setVersion((value) => value + 1);
      await Promise.all([refetch(), refetchOpen()]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="data-shell overflow-hidden p-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-display text-xl font-semibold">{openEntry() ? t("work.checkedIn") : t("work.notCheckedIn")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              <Show when={openEntry()} fallback={t("work.ready")}>
                {(entry) => t("work.since", { time: formatDateTime(entry().check_in, locale()) })}
              </Show>
            </p>
          </div>
          <Button type="button" size="lg" class="rounded-sm" variant={openEntry() ? "destructive" : "default"} disabled={pending()} onClick={() => void toggle()}>
            {openEntry() ? t("work.checkOut") : t("work.checkIn")}
          </Button>
        </div>
      </section>

      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/[0.025] p-4">
        <Suspense fallback={<PageSpinner />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <Show
            when={pageItems().length > 0}
            fallback={<EmptyState title={t("work.empty")} description={t("work.ready")} />}
          >
            <DataTable
              title={t("work.entries")}
              description={t("work.subtitle")}
              actions={<Badge variant="secondary" class="mono rounded-lg px-3 py-1">{total()}</Badge>}
              columns={columns()}
              data={pageItems()}
              enablePagination
              pageSize={WORK_PAGE_SIZE}
            />
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
