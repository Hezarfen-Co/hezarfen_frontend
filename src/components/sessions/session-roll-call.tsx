import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { deleteSessionAttendanceByUserId, getSessionAttendance, postSessionAttendance } from "@/api/sessions";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, Enrollment, PersonRef, SessionAttendance } from "@/api/client";
import { AttendanceStatusPicker } from "@/components/events/attendance-status-picker";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTrash } from "@/components/ui/icons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 8;

type RollCallTarget = {
  user: PersonRef;
  isTeacher: boolean;
};

export function SessionRollCall(props: {
  sessionId: string;
  roster: Enrollment[];
  teacher: PersonRef;
  canMarkTeacher: boolean;
}) {
  const t = useT();
  const [attendance, { refetch }] = createResource(
    () => props.sessionId,
    async (sessionId) => (await getSessionAttendance(sessionId)).items,
  );
  const rows = createMemo(() => new Map((attendance() ?? []).map((row) => [row.user.id, row])));
  const targets = createMemo<RollCallTarget[]>(() => [
    ...props.roster.map((row) => ({ user: row.user, isTeacher: false })),
    ...(props.canMarkTeacher && !props.roster.some((row) => row.user.id === props.teacher.id)
      ? [{ user: props.teacher, isTeacher: true }]
      : []),
  ]);
  const [local, setLocal] = createSignal<Record<string, AttendanceStatus>>({});
  const [pendingUserId, setPendingUserId] = createSignal<string | null>(null);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [page, setPage] = createSignal(0);
  const totalPages = createMemo(() => Math.max(1, Math.ceil(targets().length / PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const visibleTargets = createMemo(() => {
    const start = safePage() * PAGE_SIZE;
    return targets().slice(start, start + PAGE_SIZE);
  });

  createEffect(() => {
    if (page() >= totalPages()) setPage(totalPages() - 1);
  });

  const statusFor = (userId: string) => local()[userId] ?? rows().get(userId)?.status ?? "present";
  const save = async (userId: string) => {
    if (pendingUserId()) return;
    setError("");
    setPendingUserId(userId);
    try {
      await postSessionAttendance(props.sessionId, { user_id: userId, status: statusFor(userId) });
      await refetch();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPendingUserId(null);
    }
  };

  const clear = async (userId: string) => {
    if (pendingUserId()) return;
    setError("");
    setPendingUserId(userId);
    try {
      await deleteSessionAttendanceByUserId(props.sessionId, userId);
      setLocal((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
      await refetch();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div class="space-y-3">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Show
        when={targets().length > 0}
        fallback={<EmptyState kind="people" title={t("sessions.emptyRoster")} />}
      >
        <For each={visibleTargets()}>
          {(target) => {
            const saved = () => rows().get(target.user.id) as SessionAttendance | undefined;
            const pending = () => pendingUserId() === target.user.id;
            return (
              <div class="space-y-2 rounded-lg border border-border/50 bg-card px-4 py-3">
                <div class="flex min-w-0 items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium">{personLabel(target.user)}</p>
                    <Show when={target.user.display_name}>
                      <p class="truncate text-xs text-muted-foreground">{target.user.username}</p>
                    </Show>
                  </div>
                  <Show when={target.isTeacher}>
                    <Badge variant="secondary" class="shrink-0 rounded-full">{t("sessions.teacher")}</Badge>
                  </Show>
                </div>
                <div class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <AttendanceStatusPicker
                      hideLabel
                      hideDetail
                      id={`session-${props.sessionId}-${target.user.id}`}
                      value={statusFor(target.user.id)}
                      onChange={(status) => setLocal((current) => ({ ...current, [target.user.id]: status }))}
                    />
                  </div>
                  <Button
                    type="button"
                    class="h-10 w-24 shrink-0 rounded-lg"
                    variant={saved() ? "outline" : "default"}
                    disabled={pendingUserId() != null}
                    onClick={() => void save(target.user.id)}
                  >
                    {saved() ? t("common.update") : t("common.save")}
                  </Button>
                  <Show when={saved()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10"
                      aria-label={t("common.remove")}
                      disabled={pendingUserId() != null}
                      onClick={() => void clear(target.user.id)}
                    >
                      <IconTrash class="h-4 w-4" />
                    </Button>
                  </Show>
                  <Show when={pending()}>
                    <span class="sr-only" aria-live="polite">{t("common.loading")}</span>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </Show>
      <Show when={totalPages() > 1}>
        <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
      </Show>
    </div>
  );
}
