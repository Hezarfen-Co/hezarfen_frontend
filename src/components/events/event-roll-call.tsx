import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { postEventAttendance } from "@/api/events";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, EventRosterEntry } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTip } from "@/components/ui/info-tip";
import { IconCheck } from "@/components/ui/icons";
import { TablePagination } from "@/components/ui/table-pagination";
import { ATTENDANCE_STATUSES, getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import {
  eventStatusLabelKey,
  orderRollCallStatuses,
  rollCallChanges,
  saveRollCallChanges,
} from "@/lib/event-roll-call";
import { personLabel } from "@/lib/person";
import { matchesSearch } from "@/lib/search-text";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 20;

/**
 * Event roll call as one roster: every expected attendee (resolved by the
 * backend from the event's audience) with a status row. Picks stay local
 * until "Yoklamayı kaydet" sends the changed rows — the API marks one user per
 * call, so rows go one at a time with progress, and a row that fails keeps its
 * pick and shows its own error.
 */
export function EventRollCall(props: {
  eventId: string;
  roster: EventRosterEntry[];
  /** False before the event starts: statuses show, nothing can be picked. */
  open: boolean;
  closedReason?: string;
  /** How the roll call works, behind an info icon beside the progress line. */
  help?: string;
  onSaved: () => void | Promise<unknown>;
}) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const statuses = createMemo<AttendanceStatus[]>(() =>
    orderRollCallStatuses(settings.latest?.attendance_statuses ?? ATTENDANCE_STATUSES.map((item) => item.value)),
  );

  // Marks this component saved, shown until the refetched roster carries them.
  const [savedLocal, setSavedLocal] = createSignal<Record<string, AttendanceStatus>>({});
  createEffect(on(() => props.roster, () => setSavedLocal({}), { defer: true }));
  const saved = createMemo<Record<string, AttendanceStatus | null>>(() => {
    const map: Record<string, AttendanceStatus | null> = {};
    for (const row of props.roster) map[row.user.id] = row.status;
    return { ...map, ...savedLocal() };
  });

  const [draft, setDraft] = createSignal<Record<string, AttendanceStatus | undefined>>({});
  const [rowErrors, setRowErrors] = createSignal<Record<string, string>>({});
  const [progress, setProgress] = createSignal<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = createSignal<{ kind: "success" | "destructive"; text: string } | null>(null);
  const [query, setQuery] = createSignal("");
  const [onlyUnmarked, setOnlyUnmarked] = createSignal(false);
  const [page, setPage] = createSignal(0);

  const effective = (userId: string) => draft()[userId] ?? saved()[userId] ?? undefined;
  const changes = createMemo(() => rollCallChanges(saved(), draft()));
  const markedCount = createMemo(() => props.roster.filter((row) => effective(row.user.id) != null).length);
  const counts = createMemo(() => {
    const tally: Record<string, number> = {};
    for (const row of props.roster) {
      const status = effective(row.user.id);
      if (status) tally[status] = (tally[status] ?? 0) + 1;
    }
    return tally;
  });
  const unmarkedIds = createMemo(() => props.roster.filter((row) => effective(row.user.id) == null).map((row) => row.user.id));

  const visible = createMemo(() => {
    const q = query().trim();
    return props.roster.filter((row) => {
      if (onlyUnmarked() && effective(row.user.id) != null) return false;
      return !q || matchesSearch(q, personLabel(row.user), row.user.username, row.user.student_number);
    });
  });
  const pageCount = () => Math.max(1, Math.ceil(visible().length / PAGE_SIZE));
  createEffect(on([query, onlyUnmarked], () => setPage(0), { defer: true }));
  createEffect(() => {
    if (page() >= pageCount()) setPage(pageCount() - 1);
  });
  const pageRows = createMemo(() => visible().slice(page() * PAGE_SIZE, (page() + 1) * PAGE_SIZE));

  const busy = () => progress() != null;
  const locked = () => !props.open || busy();

  const statusLabel = (status: AttendanceStatus) => {
    const key = eventStatusLabelKey(status);
    if (key) return t(key);
    const meta = getAttendanceStatusMeta(status);
    return meta ? t(meta.key) : status;
  };

  const pick = (userId: string, status: AttendanceStatus) => {
    if (locked()) return;
    setSummary(null);
    setDraft((current) => {
      const next = { ...current };
      // Tapping the drafted status again drops the pick back to the saved one.
      if (current[userId] === status || saved()[userId] === status) delete next[userId];
      else next[userId] = status;
      return next;
    });
    setRowErrors((current) => {
      if (!(userId in current)) return current;
      const next = { ...current };
      delete next[userId];
      return next;
    });
  };

  const markRestPresent = () => {
    if (locked()) return;
    setSummary(null);
    setDraft((current) => {
      const next = { ...current };
      for (const userId of unmarkedIds()) next[userId] = "present";
      return next;
    });
  };

  const save = async () => {
    const queue = changes();
    if (queue.length === 0 || locked()) return;
    setSummary(null);
    setRowErrors({});
    setProgress({ done: 0, total: queue.length });
    const result = await saveRollCallChanges(
      queue,
      (change) => postEventAttendance(props.eventId, { user_id: change.userId, status: change.status }),
      (done, total) => setProgress({ done, total }),
    );
    setProgress(null);
    if (result.saved.length > 0) {
      setSavedLocal((current) => ({
        ...current,
        ...Object.fromEntries(result.saved.map((change) => [change.userId, change.status])),
      }));
      setDraft((current) => {
        const next = { ...current };
        for (const change of result.saved) delete next[change.userId];
        return next;
      });
    }
    setRowErrors(Object.fromEntries(result.failed.map((item) => [item.change.userId, formatApiError(item.error)])));
    if (result.failed.length > 0) {
      setSummary({
        kind: "destructive",
        text: t("events.rollCall.saveFailed", { failed: result.failed.length, total: queue.length }),
      });
    } else {
      setSummary({ kind: "success", text: t("events.rollCall.saved", { count: result.saved.length }) });
    }
    if (result.saved.length > 0) await props.onSaved();
  };

  return (
    <div class="space-y-3">
      <Show when={!props.open}>
        <Alert variant="info">{props.closedReason ?? t("events.rollCall.notStarted")}</Alert>
      </Show>
      <Show
        when={props.roster.length > 0}
        fallback={<EmptyState kind="people" title={t("events.rollCall.emptyRoster")} />}
      >
        <div class="space-y-2.5 rounded-xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-1">
              <p class="text-sm font-semibold text-text-strong" role="status">
                {t("rollCall.progress", { marked: markedCount(), total: props.roster.length })}
              </p>
              <Show when={props.help}>{(help) => <InfoTip text={help()} />}</Show>
            </div>
            <div class="flex flex-wrap justify-end gap-1.5">
              <For each={statuses()}>
                {(status) => (
                  <Show when={counts()[status]}>
                    <span class={cn("rounded-full border px-2 py-0.5 text-xs font-medium", getAttendanceStatusMeta(status)?.class)}>
                      {statusLabel(status)} {counts()[status]}
                    </span>
                  </Show>
                )}
              </For>
            </div>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-surface-tint" aria-hidden="true">
            <div
              class="h-full rounded-full bg-success transition-[width] duration-200"
              style={{ width: `${props.roster.length ? (markedCount() / props.roster.length) * 100 : 0}%` }}
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <DataTableSearch
              value={query()}
              onChange={setQuery}
              placeholder={t("events.selectAttendee")}
              hint={t("events.rollCall.searchHint")}
              class="sm:max-w-60"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-8 rounded-lg"
              disabled={locked() || unmarkedIds().length === 0}
              onClick={markRestPresent}
            >
              <IconCheck class="h-4 w-4" />
              {t("events.rollCall.markRestPresent")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-8 rounded-lg"
              aria-pressed={onlyUnmarked()}
              onClick={() => setOnlyUnmarked((value) => !value)}
            >
              {t("rollCall.onlyUnmarked")}
            </Button>
          </div>
        </div>

        <Show
          when={pageRows().length > 0}
          fallback={
            <p class="py-6 text-center text-sm text-muted-foreground">
              {query().trim() ? t("events.noAttendees") : t("rollCall.allMarked")}
            </p>
          }
        >
          <ul class="divide-y divide-border-hairline rounded-xl border border-border-line bg-surface-base px-3 shadow-xs sm:px-4">
            <For each={pageRows()}>
              {(row) => {
                const userId = row.user.id;
                const current = () => effective(userId);
                const pending = () => draft()[userId] != null && draft()[userId] !== saved()[userId];
                const rowError = () => rowErrors()[userId];
                const name = () => personLabel(row.user);
                return (
                  <li class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                    <div class="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        class={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          rowError() ? "bg-destructive" : pending() ? "bg-warning" : current() ? "bg-success" : "bg-border-line",
                        )}
                        aria-hidden="true"
                      />
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{name()}</p>
                        <p class={cn("truncate text-xs", rowError() ? "text-destructive-text" : "text-muted-foreground")}>
                          {rowError()
                            ? rowError()
                            : pending()
                              ? t("events.rollCall.unsaved", { status: statusLabel(current()!) })
                              : current()
                                ? statusLabel(current()!)
                                : t("rollCall.unmarked")}
                        </p>
                      </div>
                    </div>
                    <div role="radiogroup" aria-label={name()} class="grid grid-cols-4 gap-1 sm:flex">
                      <For each={statuses()}>
                        {(status) => {
                          const selected = () => current() === status;
                          return (
                            <button
                              type="button"
                              role="radio"
                              aria-checked={selected()}
                              disabled={locked()}
                              class={cn(
                                "h-9 min-w-0 rounded-lg border px-2.5 text-xs font-semibold transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                                selected()
                                  ? getAttendanceStatusMeta(status)?.class ?? "border-primary bg-primary/10 text-primary-text"
                                  : "border-border-line bg-surface-base text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                              )}
                              onClick={() => pick(userId, status)}
                            >
                              {statusLabel(status)}
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
        <TablePagination
          pageIndex={page()}
          pageCount={pageCount()}
          pageSize={PAGE_SIZE}
          total={visible().length}
          onPageChange={setPage}
        />

        <Show when={summary()}>
          {(item) => <Alert variant={item().kind}>{item().text}</Alert>}
        </Show>

        <div class="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border-line bg-surface-base px-3 py-2.5 shadow-xs sm:px-4">
          <p class="mr-auto text-xs text-muted-foreground" aria-live="polite">
            {progress()
              ? t("rollCall.marking", { done: progress()!.done, total: progress()!.total })
              : changes().length > 0
                ? t("events.rollCall.pendingChanges", { count: changes().length })
                : t("events.rollCall.noChanges")}
          </p>
          <Show when={changes().length > 0 && !busy()}>
            <Button type="button" variant="ghost" size="sm" class="h-9 rounded-lg" onClick={() => { setDraft({}); setRowErrors({}); setSummary(null); }}>
              {t("events.rollCall.discard")}
            </Button>
          </Show>
          <Button
            type="button"
            size="sm"
            class="h-9 min-w-[7.5rem] rounded-lg"
            disabled={locked() || changes().length === 0}
            onClick={() => void save()}
          >
            {t("events.saveStudentAttendance")}
          </Button>
        </div>
      </Show>
    </div>
  );
}
