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
import { PageSpinner } from "@/components/ui/page-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function WorkLogPage() {
  return (
    <RouteGuard minRole="teacher">
      <WorkLogContent />
    </RouteGuard>
  );
}

function WorkLogContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [entries, { refetch }] = createResource(() => getMyWorkLog());
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const openEntry = createMemo(() => (entries() ?? []).find((entry) => entry.check_out == null) ?? null);

  const toggle = async () => {
    setError("");
    setPending(true);
    try {
      if (openEntry()) {
        await postWorkCheckOut();
      } else {
        await postWorkCheckIn();
      }
      await refetch();
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
              <Show when={openEntry()} fallback={t("work.ready")}>{(entry) => t("work.since", { time: formatDateTime(entry().check_in, locale()) })}</Show>
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
          <Badge variant="secondary" class="mono rounded-sm px-3 py-1">{entries()?.length ?? 0}</Badge>
        </div>
        <Suspense fallback={<PageSpinner />}>
          <Show when={entries.error}>
            <Alert variant="destructive">{formatApiError(entries.error)}</Alert>
          </Show>
          <Show
            when={(entries() ?? []).length > 0}
            fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("work.empty")}</div>}
          >
            <div class="data-table-wrap">
              <Table class="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("work.checkIn")}</TableHead>
                    <TableHead>{t("work.checkOut")}</TableHead>
                    <TableHead>{t("work.duration")}</TableHead>
                    <TableHead>{t("attempt.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={entries() ?? []}>
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
            </div>
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
