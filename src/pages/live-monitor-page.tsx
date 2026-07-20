import { Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup, untrack } from "solid-js";
import { Link, useLocation, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
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
import { DataTable } from "@/components/ui/data-table";
import { IconChevronLeft } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { usePreferences, useT } from "@/stores/preferences-context";
import { createNow } from "@/lib/create-now";
import { attemptLabel } from "@/lib/exam-labels";
import { formatDateTime } from "@/lib/format";

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

    // ponytail: keep polling even with SSE; some live proxies accept EventSource
    // but never flush events. 2s GET is cheaper than stale teacher screen.
    startPolling();

    if (!("EventSource" in window)) {
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

  return (
    <Suspense fallback={<PageSpinner />}>
      <div class="space-y-6">
        <Show when={!snapshot() && !error()}>
          <PageSpinner />
        </Show>
        <Show when={exam()}>
          {(ex) => (
            <div class="space-y-2">
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
            </div>
          )}
        </Show>

        {error() && <Alert variant="destructive">{error()}</Alert>}

        <Show when={snapshot()}>
          {(s) => {
            const m = s();
            if (!m) return null;
            const counts = m.counts ?? { not_started: 0, in_progress: 0, submitted: 0, expired: 0 };
            const raw = Array.isArray(m.students) ? m.students : [];
            const columns: ColumnDef<LiveRosterEntry>[] = [
              {
                id: "username",
                accessorFn: (entry) => liveRosterName(entry, ""),
                header: t("admin.username"),
                meta: { cellClass: "font-medium" },
                cell: (cell) => liveRosterName(cell.row.original, t("exams.nameless")),
              },
              {
                id: "status",
                accessorFn: (entry) => labelFromStatus(entry.status, t),
                header: t("attempt.status"),
                meta: { headerClass: "text-center", cellClass: "text-center" },
                cell: (cell) => (
                  <Badge
                    class="rounded-full"
                    variant={
                      cell.row.original.status === "in_progress" ? "default" :
                      cell.row.original.status === "submitted" ? "secondary" :
                      "outline"
                    }
                  >
                    {labelFromStatus(cell.row.original.status, t)}
                  </Badge>
                ),
              },
              {
                id: "attempt",
                accessorFn: (entry) => entry.attempts_used ?? entry.attempt ?? 0,
                header: t("attempt.attempt"),
                meta: { headerClass: "text-center", cellClass: "text-center tabular-nums" },
                cell: (cell) => attemptLabel(cell.row.original, m.exam.max_attempts),
              },
              {
                id: "progress",
                accessorFn: (entry) => entry.answered ?? 0,
                header: t("attempt.progress"),
                meta: { headerClass: "text-center", cellClass: "min-w-32 tabular-nums" },
                cell: (cell) => (
                  <div class="flex items-center justify-center gap-2">
                    <span>{cell.row.original.answered}/{m.question_count}</span>
                    <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full bg-primary" style={{ width: `${progressPercent(cell.row.original, m.question_count)}%` }} />
                    </div>
                  </div>
                ),
              },
              {
                id: "remaining",
                accessorFn: (entry) => entry.remaining_ms ?? 0,
                header: t("attempt.remaining"),
                meta: { headerClass: "text-center", cellClass: "tabular-nums text-center" },
                cell: (cell) => (
                  <span class={isLowRemaining(cell.row.original) ? "rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300" : ""}>
                    {remainingMinutesLabel(cell.row.original)}
                  </span>
                ),
              },
              {
                id: "left",
                accessorFn: (entry) => entry.left_at ?? 0,
                header: t("attempt.left"),
                meta: { headerClass: "text-center", cellClass: "text-center text-xs" },
                cell: (cell) => cell.row.original.left_at ? formatDateTime(cell.row.original.left_at, locale()) : "—",
              },
              {
                id: "mark",
                accessorFn: (entry) => entry.mark ?? -1,
                header: t("marks.mark"),
                meta: { headerClass: "text-center", cellClass: "text-center font-semibold tabular-nums" },
                cell: (cell) => cell.row.original.mark != null ? cell.row.original.mark : "—",
              },
            ];

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
                  </div>
                  <Show
                    when={raw.length > 0}
                    fallback={
                      <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.emptyRoster")}
                      </p>
                    }
                  >
                    <DataTable columns={columns} data={raw} filterColumn="username" enablePagination pageSize={PAGE_SIZE} />
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
