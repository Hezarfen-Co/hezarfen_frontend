import { For, Show, Suspense, createEffect, createResource, createSignal, onCleanup } from "solid-js";
import { Link, useLocation } from "@tanstack/solid-router";
import { getExamLive } from "@/api/getExamLive";
import { getExamById } from "@/api/getExamById";
import { ApiError } from "@/api/client";
import type { LiveMonitor, LiveRosterEntry } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreferences, useT } from "@/stores/preferences-context";
import { createNow } from "@/lib/create-now";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type SortKey = "username" | "status" | "progress" | "remaining" | "activity" | "mark";

const PAGE_SIZE = 10;

export default function LiveMonitorPage() {
  return (
    <RouteGuard>
      <LiveMonitorContent />
    </RouteGuard>
  );
}

const STATUS_KEY: Record<string, MessageKey> = {
  not_started: "exams.notStarted",
  in_progress: "attempt.inProgress",
  submitted: "attempt.submitted",
  expired: "attempt.expired",
};

function labelFromStatus(status: string, t: (key: MessageKey) => string): string {
  const k = STATUS_KEY[status];
  return k ? t(k) : status;
}

function LiveMonitorContent() {
  const location = useLocation();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const id = () => decodeURIComponent(location().pathname.split("/")[2] ?? "");

  const [exam] = createResource(id, (eid) => getExamById(eid));
  const [snapshot, setSnapshot] = createSignal<LiveMonitor | null>(null);
  const [error, setError] = createSignal("");
  const [sortKey, setSortKey] = createSignal<SortKey>("status");
  const [sortDir, setSortDir] = createSignal<"asc" | "desc">("asc");
  const [page, setPage] = createSignal(0);

  const isFinished = () => {
    const e = exam();
    if (!e || e.ends_at == null) return false;
    return e.ends_at < now();
  };

  const fetchSnapshot = async () => {
    try {
      const data = await getExamLive(id());
      setSnapshot(data);
    } catch (err) {
      console.error("[live-monitor] fetch error:", err);
      setError(err instanceof ApiError ? err.message : "Failed to load");
    }
  };

  createEffect(() => {
    const eid = id();
    const e = exam();
    if (!eid || !e) return;
    void fetchSnapshot();
    if (e.ends_at != null && e.ends_at < Date.now()) return;
    const interval = setInterval(() => {
      if (e.ends_at != null && e.ends_at < Date.now()) {
        clearInterval(interval);
        void fetchSnapshot();
        return;
      }
      void fetchSnapshot();
    }, 2000);
    onCleanup(() => clearInterval(interval));
  });

  const toggleSort = (key: SortKey) => {
    setPage(0);
    if (sortKey() === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortFn = (a: LiveRosterEntry, b: LiveRosterEntry) => {
    const d = sortDir();
    const cmp = (() => {
      const k = sortKey();
      if (k === "username") return (a.display_name || a.username || "").localeCompare(b.display_name || b.username || "");
      if (k === "status") return labelFromStatus(a.status, t).localeCompare(labelFromStatus(b.status, t));
      if (k === "progress") return (a.answered ?? 0) - (b.answered ?? 0);
      if (k === "remaining") return (a.remaining_ms ?? 0) - (b.remaining_ms ?? 0);
      if (k === "activity") return (a.last_activity ?? 0) - (b.last_activity ?? 0);
      if (k === "mark") return (a.mark ?? -1) - (b.mark ?? -1);
      return 0;
    })();
    return d === "asc" ? cmp : -cmp;
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <div class="space-y-6">
        <Show when={exam()}>
          {(ex) => (
            <PageHeader
              compact
              accent="rose"
              eyebrow={isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
              title={ex().title}
              description={isFinished() ? t("exams.finalStateDesc") : t("exams.liveMonitorDesc")}
              actions={
                <div class="flex flex-wrap items-center gap-1 rounded-md border bg-background/70 p-1 shadow-sm">
                  <Link to="/exams/$id" params={{ id: id() }}>
                    <Button variant="ghost" size="sm" class="rounded-sm">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                </div>
              }
            />
          )}
        </Show>

        {error() && <Alert variant="destructive">{error()}</Alert>}

        <Show when={snapshot()}>
          {(s) => {
            const m = s();
            if (!m) return null;
            const counts = m.counts ?? { not_started: 0, in_progress: 0, submitted: 0, expired: 0 };
            const raw = Array.isArray(m.students) ? m.students : [];
            const sorted = [...raw].sort(sortFn);
            const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
            const safePage = Math.min(page(), totalPages - 1);
            const pageItems = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

            return (
              <>
                <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div class="surface-card p-4">
                    <p class="text-xs text-muted-foreground">{t("exams.notStarted")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.not_started}</p>
                  </div>
                  <div class="surface-card p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.inProgress")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.in_progress}</p>
                  </div>
                  <div class="surface-card p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.submitted")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.submitted}</p>
                  </div>
                  <div class="surface-card p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.expired")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.expired}</p>
                  </div>
                </section>

                <section class="surface-card p-2 sm:p-4">
                  <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.liveRoster")}</h2>
                  <Show
                    when={sorted.length > 0}
                    fallback={<p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">{t("exams.emptyRoster")}</p>}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortHead label={t("admin.username")} sortKey="username" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-left" />
                          <SortHead label={t("attempt.status")} sortKey="status" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                          <SortHead label={t("attempt.progress")} sortKey="progress" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                          <SortHead label={t("attempt.remaining")} sortKey="remaining" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                          <SortHead label={t("exams.lastActivity")} sortKey="activity" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                          <SortHead label={t("marks.mark")} sortKey="mark" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={pageItems}>
                          {(entry) => (
                            <TableRow>
                              <TableCell class="font-medium">
                                {entry.display_name || entry.username || t("exams.nameless")}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  entry.status === "in_progress" ? "default" :
                                  entry.status === "submitted" ? "secondary" :
                                  "outline"
                                }>
                                  {labelFromStatus(entry.status, t)}
                                </Badge>
                              </TableCell>
                              <TableCell class="tabular-nums text-center">{entry.answered}/{m.question_count}</TableCell>
                              <TableCell class="tabular-nums text-center">
                                {entry.status === "in_progress" && entry.remaining_ms > 0
                                  ? `${Math.ceil(entry.remaining_ms / 60000)}dk`
                                  : entry.status === "in_progress" && entry.remaining_ms <= 0
                                    ? `<1dk`
                                    : "—"}
                              </TableCell>
                              <TableCell class="text-xs text-center">
                                {entry.last_activity ? formatDateTime(entry.last_activity, locale()) : "—"}
                              </TableCell>
                              <TableCell class="tabular-nums font-semibold text-center">
                                {entry.mark != null ? entry.mark : "—"}
                              </TableCell>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>

                    <Show when={sorted.length > PAGE_SIZE}>
                      <div class="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-8 gap-1"
                          disabled={safePage <= 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          <IconChevronLeft class="h-3.5 w-3.5" />
                          {t("common.prev")}
                        </Button>
                        <span class="text-xs tabular-nums text-muted-foreground">
                          {t("common.pageOf", { page: safePage + 1, total: totalPages })}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-8 gap-1"
                          disabled={safePage >= totalPages - 1}
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        >
                          {t("common.next")}
                          <IconChevronRight class="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Show>
                  </Show>
                </section>
              </>
            );
          }}
        </Show>
      </div>
    </Suspense>
  );
}

function SortHead(props: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  class?: string;
}) {
  const active = () => props.sortKey === props.currentKey;
  return (
    <TableHead
      class={cn("cursor-pointer select-none hover:text-foreground", props.class, active() && "text-foreground")}
      onClick={() => props.onSort(props.sortKey)}
    >
      <span class="inline-flex items-center gap-1">
        {props.label}
        <Show when={active()}>
          <span class="text-[10px]">{props.currentDir === "asc" ? "▲" : "▼"}</span>
        </Show>
      </span>
    </TableHead>
  );
}
