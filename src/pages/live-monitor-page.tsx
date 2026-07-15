import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup, untrack } from "solid-js";
import { Link, useLocation, useParams } from "@tanstack/solid-router";
import { getExamLive } from "@/api/getExamLive";
import { getExamLiveStreamUrl } from "@/api/getExamLiveStreamUrl";
import { getExamById } from "@/api/getExamById";
import { formatApiError } from "@/api/client";
import type { LiveMonitor, LiveRosterEntry } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableFrame } from "@/components/ui/data-table";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreferences, useT } from "@/stores/preferences-context";
import { createNow } from "@/lib/create-now";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type SortKey = "username" | "status" | "attempt" | "progress" | "remaining" | "left" | "mark";

const PAGE_SIZE = 10;

export default function LiveMonitorPage() {
  return (
    <RouteGuard minRole="teacher">
      <LiveMonitorContent />
    </RouteGuard>
  );
}

const STATUS_KEY: Record<string, MessageKey> = {
  not_started: "exams.notStarted",
  in_progress: "attempt.inProgress",
  submitted: "attempt.submitted",
  expired: "attempt.expired",
  absent: "attempt.absent",
};

function labelFromStatus(status: string, t: (key: MessageKey) => string): string {
  const k = STATUS_KEY[status];
  return k ? t(k) : status;
}

function progressPercent(entry: LiveRosterEntry, questionCount: number): number {
  if (questionCount <= 0) return 0;
  return Math.round(((entry.answered ?? 0) / questionCount) * 100);
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function liveRosterName(entry: LiveRosterEntry, fallback: string): string {
  const record = entry as unknown as Record<string, unknown>;
  const nestedUser = typeof record.user === "object" && record.user !== null
    ? (record.user as Record<string, unknown>)
    : null;
  const fullName = [textField(record, "name"), textField(record, "surname")].filter(Boolean).join(" ");
  return (
    textField(record, "display_name") ||
    (nestedUser ? textField(nestedUser, "display_name") : "") ||
    fullName ||
    textField(record, "username") ||
    textField(record, "user_name") ||
    (nestedUser ? textField(nestedUser, "username") : "") ||
    (typeof record.user === "string" ? record.user : "") ||
    textField(record, "user_id") ||
    fallback
  );
}

function remainingMinutesLabel(entry: LiveRosterEntry): string {
  const remaining = entry.remaining_ms;
  if (entry.status !== "in_progress") return "—";
  if (remaining == null) return "—";
  if (remaining > 0) return `${Math.ceil(remaining / 60000)}dk`;
  return "<1dk";
}

function isLowRemaining(entry: LiveRosterEntry): boolean {
  const remaining = entry.remaining_ms ?? 0;
  return entry.status === "in_progress" && remaining <= 5 * 60 * 1000;
}

function attemptLabel(entry: LiveRosterEntry): string {
  if (entry.attempts_used != null && entry.max_attempts != null) return `${entry.attempts_used} / ${entry.max_attempts}`;
  if (entry.attempt != null) return String(entry.attempt);
  if (entry.attempts_used != null) return String(entry.attempts_used);
  return "—";
}

function LiveMonitorContent() {
  const location = useLocation();
  const params = useParams({ from: "/exams/$id/live" });
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const id = createMemo(() => {
    location();
    return params().id;
  });

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
      setError("");
    } catch (err) {
      console.error("[live-monitor] fetch error:", err);
      setError(formatApiError(err, locale()));
    }
  };

  const applyStreamEvent = (event: MessageEvent) => {
    try {
      setSnapshot(JSON.parse(event.data) as LiveMonitor);
      setError("");
    } catch (err) {
      console.error("[live-monitor] stream parse error:", err);
    }
  };

  createEffect(() => {
    const eid = id();
    const e = exam();
    if (!eid || !e) return;
    void fetchSnapshot();
    if (e.ends_at != null && e.ends_at < untrack(now)) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (e.ends_at != null && e.ends_at < untrack(now)) {
          if (interval) clearInterval(interval);
          interval = null;
          void fetchSnapshot();
          return;
        }
        void fetchSnapshot();
      }, 2000);
    };

    if (!("EventSource" in window)) {
      startPolling();
      onCleanup(() => {
        if (interval) clearInterval(interval);
      });
      return;
    }

    const source = new EventSource(getExamLiveStreamUrl(eid), { withCredentials: true });
    source.addEventListener("snapshot", applyStreamEvent);
    source.onmessage = applyStreamEvent;
    source.onerror = () => {
      source.close();
      startPolling();
    };

    onCleanup(() => {
      source.close();
      if (interval) {
        clearInterval(interval);
      }
    });
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
      if (k === "username") return liveRosterName(a, "").localeCompare(liveRosterName(b, ""));
      if (k === "status") return labelFromStatus(a.status, t).localeCompare(labelFromStatus(b.status, t));
      if (k === "attempt") return (a.attempts_used ?? a.attempt ?? 0) - (b.attempts_used ?? b.attempt ?? 0);
      if (k === "progress") return (a.answered ?? 0) - (b.answered ?? 0);
      if (k === "remaining") return (a.remaining_ms ?? 0) - (b.remaining_ms ?? 0);
      if (k === "left") return (a.left_at ?? 0) - (b.left_at ?? 0);
      if (k === "mark") return (a.mark ?? -1) - (b.mark ?? -1);
      return 0;
    })();
    return d === "asc" ? cmp : -cmp;
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <div class="space-y-6">
        <Show when={!snapshot() && !error()}>
          <PageSpinner />
        </Show>
        <Show when={exam()}>
          {(ex) => (
            <PageHeader
              compact
              accent="rose"
              eyebrow={isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
              title={ex().title}
              description={isFinished() ? t("exams.finalStateDesc") : t("exams.liveMonitorDesc")}
              actions={
                <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1 shadow-sm sm:w-auto">
                  <Link to="/exams/$id" params={{ id: id() }}>
                    <Button variant="ghost" size="sm" class="w-full rounded-md sm:w-auto">
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
                <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div class="surface-card bg-card/80 p-4">
                    <p class="text-xs text-muted-foreground">{t("exams.notStarted")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.not_started}</p>
                  </div>
                  <div class="surface-card bg-card/80 p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.inProgress")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.in_progress}</p>
                  </div>
                  <div class="surface-card bg-card/80 p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.submitted")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.submitted}</p>
                  </div>
                  <div class="surface-card bg-card/80 p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.expired")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.expired}</p>
                  </div>
                  <div class="surface-card bg-card/80 p-4">
                    <p class="text-xs text-muted-foreground">{t("attempt.absent")}</p>
                    <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{counts.absent ?? 0}</p>
                  </div>
                </section>

                <section class="surface-card space-y-4 p-5">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 class="font-display text-lg font-semibold">{t("exams.liveRoster")}</h2>
                      <p class="mt-1 text-sm text-muted-foreground">{t("attempt.progress")}</p>
                    </div>
                    <Badge variant="outline" class="rounded-full px-3 py-1">
                      {sorted.length} / {m.question_count}
                    </Badge>
                  </div>
                  <Show
                    when={sorted.length > 0}
                    fallback={
                      <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.emptyRoster")}
                      </p>
                    }
                  >
                    <DataTableFrame>
                      <Table class="data-table">
                        <TableHeader>
                          <TableRow>
                            <SortHead label={t("admin.username")} sortKey="username" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-left" />
                            <SortHead label={t("attempt.status")} sortKey="status" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                            <SortHead label={t("attempt.attempt")} sortKey="attempt" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                            <SortHead label={t("attempt.progress")} sortKey="progress" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                            <SortHead label={t("attempt.remaining")} sortKey="remaining" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                            <SortHead label={t("attempt.left")} sortKey="left" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                            <SortHead label={t("marks.mark")} sortKey="mark" currentKey={sortKey()} currentDir={sortDir()} onSort={toggleSort} class="text-center" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <For each={pageItems}>
                            {(entry) => (
                              <TableRow>
                                <TableCell class="font-medium">
                                  {liveRosterName(entry, t("exams.nameless"))}
                                </TableCell>
                                <TableCell class="text-center">
                                  <Badge
                                    class="rounded-full"
                                    variant={
                                      entry.status === "in_progress" ? "default" :
                                      entry.status === "submitted" ? "secondary" :
                                      "outline"
                                    }
                                  >
                                    {labelFromStatus(entry.status, t)}
                                  </Badge>
                                </TableCell>
                                <TableCell class="text-center tabular-nums">
                                  {attemptLabel(entry)}
                                </TableCell>
                                <TableCell class="min-w-32 tabular-nums">
                                  <div class="flex items-center justify-center gap-2">
                                    <span>{entry.answered}/{m.question_count}</span>
                                    <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                      <div class="h-full rounded-full bg-primary" style={{ width: `${progressPercent(entry, m.question_count)}%` }} />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell class="tabular-nums text-center">
                                  <span class={isLowRemaining(entry) ? "rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300" : ""}>
                                    {remainingMinutesLabel(entry)}
                                  </span>
                                </TableCell>
                                <TableCell class="text-center text-xs">
                                  {entry.left_at ? formatDateTime(entry.left_at, locale()) : "—"}
                                </TableCell>
                                <TableCell class="text-center font-semibold tabular-nums">
                                  {entry.mark != null ? entry.mark : "—"}
                                </TableCell>
                              </TableRow>
                            )}
                          </For>
                        </TableBody>
                      </Table>
                    </DataTableFrame>

                    <Show when={sorted.length > PAGE_SIZE}>
                      <div class="mt-4 flex flex-col items-stretch gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-9 gap-1 rounded-md"
                          disabled={safePage <= 0}
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                          <IconChevronLeft class="h-3.5 w-3.5" />
                          {t("common.prev")}
                        </Button>
                        <span class="text-center text-xs tabular-nums text-muted-foreground">
                          {t("common.pageOf", { page: safePage + 1, total: totalPages })}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-9 gap-1 rounded-md"
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
