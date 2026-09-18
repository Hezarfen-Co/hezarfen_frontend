import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { deleteSessionAttendanceByUserId, getSessionAttendance, postSessionAttendance } from "@/api/sessions";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, Enrollment, PersonRef } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconX } from "@/components/ui/icons";
import { ATTENDANCE_STATUSES, getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

/** Parallel requests while marking the rest present; the API takes one row per call. */
const BULK_CONCURRENCY = 4;

type RollCallTarget = {
  user: PersonRef;
  isTeacher: boolean;
};

/**
 * Lesson roll call built for speed: one list, a tap on a status saves that
 * row at once, and "mark the rest present" fills every unmarked row — the
 * teacher then only touches the exceptions. Nothing is shown as present
 * until it is actually saved: an unmarked row stays visibly unmarked.
 */
export function SessionRollCall(props: {
  sessionId: string;
  roster: Enrollment[];
  teacher: PersonRef;
  canMarkTeacher: boolean;
}) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const statuses = createMemo<AttendanceStatus[]>(
    () => settings.latest?.attendance_statuses ?? ATTENDANCE_STATUSES.map((item) => item.value),
  );
  const [attendance] = createResource(
    () => props.sessionId,
    async (sessionId) => (await getSessionAttendance(sessionId)).items,
  );
  // Saved marks live in a local signal seeded from the server list: a tap
  // updates it optimistically instead of refetching the whole roster.
  const [marks, setMarks] = createSignal<Record<string, AttendanceStatus>>({});
  createEffect(() => {
    const rows = attendance.latest;
    if (rows) setMarks(Object.fromEntries(rows.map((row) => [row.user.id, row.status])));
  });

  // The roster renders from props at once, but the saved marks arrive with
  // the attendance read; a tap before then would be overwritten by it, so
  // the status buttons wait for it.
  const ready = () => attendance.latest !== undefined;
  const targets = createMemo<RollCallTarget[]>(() => [
    ...props.roster.map((row) => ({ user: row.user, isTeacher: false })),
    ...(props.canMarkTeacher && !props.roster.some((row) => row.user.id === props.teacher.id)
      ? [{ user: props.teacher, isTeacher: true }]
      : []),
  ]);
  const [saving, setSaving] = createSignal<ReadonlySet<string>>(new Set());
  const [error, setError] = createSignal("");
  const [onlyUnmarked, setOnlyUnmarked] = createSignal(false);
  const [bulk, setBulk] = createSignal<{ done: number; total: number } | null>(null);

  const markedCount = createMemo(() => targets().filter((target) => marks()[target.user.id] != null).length);
  const unmarked = createMemo(() => targets().filter((target) => marks()[target.user.id] == null));
  const counts = createMemo(() => {
    const tally: Record<string, number> = {};
    for (const target of targets()) {
      const status = marks()[target.user.id];
      if (status) tally[status] = (tally[status] ?? 0) + 1;
    }
    return tally;
  });
  const visibleTargets = createMemo(() => (onlyUnmarked() ? unmarked() : targets()));

  const setBusy = (userId: string, busy: boolean) =>
    setSaving((current) => {
      const next = new Set(current);
      if (busy) next.add(userId);
      else next.delete(userId);
      return next;
    });
  const setMark = (userId: string, status: AttendanceStatus | undefined) =>
    setMarks((current) => {
      const next = { ...current };
      if (status) next[userId] = status;
      else delete next[userId];
      return next;
    });

  const mark = async (userId: string, status: AttendanceStatus) => {
    const previous = marks()[userId];
    if (previous === status || saving().has(userId)) return;
    setError("");
    setMark(userId, status);
    setBusy(userId, true);
    try {
      await postSessionAttendance(props.sessionId, { user_id: userId, status });
    } catch (err) {
      setMark(userId, previous);
      setError(formatApiError(err));
    } finally {
      setBusy(userId, false);
    }
  };

  const clear = async (userId: string) => {
    const previous = marks()[userId];
    if (!previous || saving().has(userId)) return;
    setError("");
    setMark(userId, undefined);
    setBusy(userId, true);
    try {
      await deleteSessionAttendanceByUserId(props.sessionId, userId);
    } catch (err) {
      setMark(userId, previous);
      setError(formatApiError(err));
    } finally {
      setBusy(userId, false);
    }
  };

  const markRestPresent = async () => {
    // Students only: the teacher's own presence row is a separate, deliberate call.
    const queue = unmarked().filter((target) => !target.isTeacher).map((target) => target.user.id);
    if (queue.length === 0 || bulk()) return;
    setError("");
    setBulk({ done: 0, total: queue.length });
    const failures: unknown[] = [];
    const worker = async () => {
      for (let userId = queue.shift(); userId; userId = queue.shift()) {
        setMark(userId, "present");
        setBusy(userId, true);
        try {
          await postSessionAttendance(props.sessionId, { user_id: userId, status: "present" });
        } catch (err) {
          setMark(userId, undefined);
          failures.push(err);
        } finally {
          setBusy(userId, false);
          setBulk((current) => (current ? { ...current, done: current.done + 1 } : current));
        }
      }
    };
    await Promise.all(Array.from({ length: BULK_CONCURRENCY }, worker));
    setBulk(null);
    if (failures.length > 0) setError(t("rollCall.bulkFailed", { count: failures.length, reason: formatApiError(failures[0]) }));
  };

  const statusLabel = (status: AttendanceStatus) => {
    const meta = getAttendanceStatusMeta(status);
    return meta ? t(meta.key) : status;
  };

  return (
    <div class="space-y-3">
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Show
        when={targets().length > 0}
        fallback={<EmptyState kind="people" title={t("sessions.emptyRoster")} />}
      >
        <div class="sticky top-0 z-10 -mx-5 space-y-2.5 border-b border-border-hairline bg-surface-base px-5 pb-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-text-strong" role="status">
              {ready() ? t("rollCall.progress", { marked: markedCount(), total: targets().length }) : t("common.loading")}
            </p>
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
              style={{ width: `${targets().length ? (markedCount() / targets().length) * 100 : 0}%` }}
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              class="h-9 rounded-lg"
              disabled={!ready() || bulk() != null || unmarked().filter((target) => !target.isTeacher).length === 0}
              onClick={() => void markRestPresent()}
            >
              <IconCheck class="h-4 w-4" />
              {bulk()
                ? t("rollCall.marking", { done: bulk()!.done, total: bulk()!.total })
                : t("rollCall.markRestPresent")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-9 rounded-lg"
              aria-pressed={onlyUnmarked()}
              onClick={() => setOnlyUnmarked((value) => !value)}
            >
              {t("rollCall.onlyUnmarked")}
            </Button>
          </div>
        </div>

        <Show
          when={visibleTargets().length > 0}
          fallback={<p class="py-6 text-center text-sm text-muted-foreground">{t("rollCall.allMarked")}</p>}
        >
          <ul class="divide-y divide-border-hairline">
            <For each={visibleTargets()}>
              {(target) => {
                const current = () => marks()[target.user.id];
                const busy = () => saving().has(target.user.id);
                const groupLabel = () => personLabel(target.user);
                return (
                  <li class="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                    <div class="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        class={cn("h-2 w-2 shrink-0 rounded-full", current() ? "bg-success" : "bg-border-line")}
                        aria-hidden="true"
                      />
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{groupLabel()}</p>
                        <p class="truncate text-xs text-muted-foreground">
                          {current() ? statusLabel(current()!) : t("rollCall.unmarked")}
                        </p>
                      </div>
                      <Show when={target.isTeacher}>
                        <Badge variant="secondary" class="shrink-0 rounded-full">{t("sessions.teacher")}</Badge>
                      </Show>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <div role="radiogroup" aria-label={groupLabel()} class="grid flex-1 grid-cols-4 gap-1 sm:flex sm:flex-none">
                        <For each={statuses()}>
                          {(status) => {
                            const selected = () => current() === status;
                            return (
                              <button
                                type="button"
                                role="radio"
                                aria-checked={selected()}
                                disabled={!ready() || busy() || bulk() != null}
                                class={cn(
                                  "h-9 min-w-0 rounded-lg border px-2.5 text-xs font-semibold transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                                  selected()
                                    ? getAttendanceStatusMeta(status)?.class ?? "border-primary bg-primary/10 text-primary-text"
                                    : "border-border-line bg-surface-base text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                )}
                                onClick={() => void mark(target.user.id, status)}
                              >
                                {statusLabel(status)}
                              </button>
                            );
                          }}
                        </For>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class={cn("h-9 w-9 shrink-0 text-muted-foreground", !current() && "invisible")}
                        aria-label={t("rollCall.clear")}
                        disabled={busy() || !current()}
                        onClick={() => void clear(target.user.id)}
                      >
                        <IconX class="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
