import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { getMyWorkLog } from "@/api/getMyWorkLog";
import { postWorkCheckIn } from "@/api/postWorkCheckIn";
import { postWorkCheckOut } from "@/api/postWorkCheckOut";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableFrame } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  const [pending, setPending] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const [version, setVersion] = createSignal(0);

  const [openProbe, { refetch: refetchOpen }] = createResource(
    () => version(),
    async () => (await getMyWorkLog({ limit: 1, offset: 0 })).items,
  );
  const openEntry = createMemo(() => (openProbe() ?? []).find((entry) => entry.check_out == null) ?? null);

  const [list, { refetch }] = createResource(
    () => ({ page: page(), version: version() }),
    async (key) =>
      loadListPage({
        page: key.page,
        pageSize: WORK_PAGE_SIZE,
        clientMode: false,
        fetch: getMyWorkLog,
      }),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), WORK_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  const toggle = async () => {
    setError("");
    setPending(true);
    try {
      if (openEntry()) {
        await postWorkCheckOut();
      } else {
        await postWorkCheckIn();
      }
      setPage(0);
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
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.admin")}</span>
          <span>/</span>
          <span>{t("nav.work")}</span>
        </div>
        <PageHeader accent="amber" eyebrow={t("nav.work")} title={t("work.title")} description={t("work.subtitle")} />
      </div>

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

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-display text-lg font-semibold">{t("work.entries")}</h2>
          <Badge variant="secondary" class="mono rounded-sm px-3 py-1">
            {total()}
          </Badge>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <Show
            when={pageItems().length > 0}
            fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("work.empty")}</div>}
          >
            <DataTableFrame>
              <Table class="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("work.checkIn")}</TableHead>
                    <TableHead>{t("work.checkOut")}</TableHead>
                    <TableHead>{t("work.duration")}</TableHead>
                    <TableHead>{t("work.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={pageItems()}>
                    {(entry) => (
                      <TableRow>
                        <TableCell class="mono">{formatDateTime(entry.check_in, locale())}</TableCell>
                        <TableCell class="mono">{formatDateTime(entry.check_out, locale())}</TableCell>
                        <TableCell class="mono">{formatDurationMinutes(entry.duration_ms, locale())}</TableCell>
                        <TableCell>
                          <Badge variant={entry.check_out == null ? "default" : "secondary"} class="rounded-sm">
                            {entry.check_out == null ? t("work.open") : t("work.closed")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </DataTableFrame>
            <Show when={total() > WORK_PAGE_SIZE}>
              <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
            </Show>
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
