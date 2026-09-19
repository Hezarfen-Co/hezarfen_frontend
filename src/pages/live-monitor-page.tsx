import { Show, Suspense, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { Link, useLocation, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getExamLive } from "@/api/exams";
import { getExamById } from "@/api/exams";
import { formatApiError } from "@/api/client";
import type { LiveMonitor, LiveRosterEntry } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DetailField } from "@/components/ui/detail-field";
import { IconAlert, IconCheck, IconChevronLeft, IconClock, IconExam, IconEye, IconUsers } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { usePreferences, useT } from "@/stores/preferences-context";
import { createNow } from "@/lib/create-now";
import { cn } from "@/lib/cn";
import { attemptLabel } from "@/lib/exam-labels";
import { examStatusTone, liveDisplayStatus, type LiveDisplayStatus } from "@/lib/exam-status";
import { formatDateTime } from "@/lib/format";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";

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
  left: "attempt.left",
  submitted: "attempt.submitted",
  expired: "attempt.expired",
  absent: "attempt.absent",
  no_attempts_left: "attempt.noAttemptsLeft",
};

type LiveRosterRow = LiveRosterEntry & { displayStatus: LiveDisplayStatus };

function labelFromStatus(status: string, t: (key: MessageKey) => string): string {
  const k = STATUS_KEY[status];
  return k ? t(k) : status;
}

function statusTone(status: string): string {
  if (status === "in_progress") return "active";
  if (status === "submitted") return "submitted";
  if (status === "expired" || status === "absent" || status === "left" || status === "no_attempts_left") return "finished";
  return "unscheduled";
}

function liveTone(status: LiveDisplayStatus): string {
  if (status === "in_progress") return "active";
  if (status === "expired") return "finished";
  if (status === "absent" || status === "left" || status === "not_started") return statusTone(status);
  return examStatusTone(status);
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

function minutesLabel(ms: number): string {
  if (ms <= 0) return "0dk";
  return `${Math.ceil(ms / 60000)}dk`;
}

function remainingMinutesLabel(entry: LiveRosterRow): string {
  const remaining = entry.remaining_ms;
  if (entry.displayStatus !== "not_started" && entry.displayStatus !== "in_progress") return "—";
  if (remaining == null) return "—";
  return minutesLabel(remaining);
}

function isLowRemaining(entry: LiveRosterRow): boolean {
  const remaining = entry.remaining_ms ?? 0;
  return entry.displayStatus === "in_progress" && remaining <= 5 * 60 * 1000;
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
  const [selectedUserId, setSelectedUserId] = createSignal<string | null>(null);

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

  createEffect(() => {
    const eid = id();
    const e = exam();
    if (!eid || !e) return;
    void fetchSnapshot();
    if (e.ends_at != null && e.ends_at < untrack(now)) return;

    const interval = setInterval(() => {
      if (e.ends_at != null && e.ends_at < untrack(now)) {
        clearInterval(interval);
        void fetchSnapshot();
        return;
      }
      void fetchSnapshot();
    }, 2000);

    onCleanup(() => clearInterval(interval));
  });

  const liveRows = createMemo<LiveRosterRow[]>(() => {
    const m = snapshot();
    return m && Array.isArray(m.students) ? m.students.map((entry) => ({ ...entry, displayStatus: liveDisplayStatus(entry, m.exam, m.now) })) : [];
  });
  const selectedRow = createMemo(() => liveRows().find((row) => row.user.id === selectedUserId()) ?? null);

  const counts = createMemo(() => liveRows().reduce(
    (acc, entry) => {
      if (entry.displayStatus === "submitted") acc.submitted += 1;
      else if (entry.displayStatus === "expired") acc.expired += 1;
      else if (entry.displayStatus === "no_attempts_left") acc.no_attempts_left += 1;
      else if (entry.displayStatus === "absent") acc.absent += 1;
      else if (entry.displayStatus === "in_progress") acc.in_progress += 1;
      else acc.not_started += 1;
      return acc;
    },
    { not_started: 0, in_progress: 0, submitted: 0, expired: 0, no_attempts_left: 0, absent: 0 },
  ));

  const columns = createMemo<ColumnDef<LiveRosterRow>[]>(() => {
    const m = snapshot();
    const questionCount = m?.question_count ?? 0;
    return [
      {
        id: "username",
        accessorFn: (entry) => liveRosterName(entry, ""),
        header: t("admin.username"),
        meta: { cellClass: "font-medium" },
        cell: (cell) => liveRosterName(cell.row.original, t("exams.nameless")),
      },
      {
        id: "status",
        accessorFn: (entry) => labelFromStatus(entry.displayStatus, t),
        header: t("attempt.status"),
        meta: { headerClass: "text-center", cellClass: "text-center" },
        cell: (cell) => (
          <Badge
            variant="outline"
            class={cn("rounded-full", scheduleStatusClass(liveTone(cell.row.original.displayStatus)))}
          >
            <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(liveTone(cell.row.original.displayStatus)))} />
            {labelFromStatus(cell.row.original.displayStatus, t)}
          </Badge>
        ),
      },
      {
        id: "progress",
        accessorFn: (entry) => entry.answered ?? 0,
        header: t("attempt.progress"),
        meta: { headerClass: "text-center", cellClass: "min-w-32 tabular-nums" },
        cell: (cell) => (
          <div class="flex items-center justify-center gap-2">
            <span>{cell.row.original.answered}/{questionCount}</span>
            <div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full bg-primary" style={{ width: `${progressPercent(cell.row.original, questionCount)}%` }} />
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
        id: "actions",
        header: t("common.actions"),
        meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap" },
        cell: (cell) => (
          <TableRowActions
            label={t("common.actions")}
            actions={[{
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => setSelectedUserId(cell.row.original.user.id),
            }]}
          />
        ),
      },
    ];
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
                eyebrow={isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
                title={ex().title}
                description={isFinished() ? t("exams.finalStateDesc") : t("exams.liveMonitorDesc")}
                actions={
                  <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1 shadow-xs sm:w-auto">
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
              <>
                <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconClock class="h-3.5 w-3.5" />{t("exams.notStarted")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().not_started}</p>
                  </div>
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconExam class="h-3.5 w-3.5 text-info-text" />{t("attempt.inProgress")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().in_progress}</p>
                  </div>
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconCheck class="h-3.5 w-3.5 text-success-text" />{t("attempt.submitted")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().submitted}</p>
                  </div>
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconClock class="h-3.5 w-3.5 text-destructive-text" />{t("attempt.expired")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().expired}</p>
                  </div>
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconAlert class="h-3.5 w-3.5 text-destructive-text" />{t("attempt.noAttemptsLeft")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().no_attempts_left}</p>
                  </div>
                  <div class="data-shell bg-card/80 p-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconUsers class="h-3.5 w-3.5" />{t("attempt.absent")}</p><p class="mt-1 text-2xl font-semibold tabular-nums">{counts().absent}</p>
                  </div>
                </section>

                <section class="space-y-4 p-0">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 class="text-lg font-semibold">{t("exams.liveRoster")}</h2>
                      <p class="mt-1 text-sm text-muted-foreground">{t("attempt.progress")}</p>
                    </div>
                  </div>
                  <Show
                    when={liveRows().length > 0}
                    fallback={
                      <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.emptyRoster")}
                      </p>
                    }
                  >
                    <DataTable
                      columns={columns()}
                      data={liveRows()}
                      filterColumn="username"
                      storageKey="live-exam-roster"
                      enablePagination
                      pageSize={PAGE_SIZE}
                      onRowClick={(row) => setSelectedUserId(row.user.id)}
                    />
                  </Show>
                </section>
                <SidePanel
                  open={selectedRow() != null}
                  onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}
                  title={selectedRow() ? liveRosterName(selectedRow()!, t("exams.nameless")) : t("exams.liveRoster")}
                  description={selectedRow() ? labelFromStatus(selectedRow()!.displayStatus, t) : ""}
                >
                  <Show when={selectedRow()} keyed>
                    {(row) => (
                      <div class="grid gap-4 sm:grid-cols-2">
                        <DetailField label={t("attempt.attempt")} value={attemptLabel(row, snapshot()?.exam.max_attempts ?? 0)} />
                        <DetailField label={t("marks.mark")} value={row.mark == null ? "—" : String(row.mark)} />
                        <DetailField label={t("events.starts")} value={formatDateTime(row.started_at, locale())} />
                        <DetailField label={t("events.ends")} value={formatDateTime(row.finished_at, locale())} />
                        <DetailField label={t("attempt.left")} value={formatDateTime(row.left_at, locale())} />
                        <DetailField label={t("exams.lastActivity")} value={formatDateTime(row.last_activity, locale())} />
                      </div>
                    )}
                  </Show>
                </SidePanel>
              </>
        </Show>
      </div>
    </Suspense>
  );
}
