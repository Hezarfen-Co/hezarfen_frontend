import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteSessionById } from "@/api/deleteSessionById";
import { getCourseSessions } from "@/api/getCourseSessions";
import { getSessionAttendance } from "@/api/getSessionAttendance";
import { getTime } from "@/api/getTime";
import { patchSessionById } from "@/api/patchSessionById";
import { postCourseSession } from "@/api/postCourseSession";
import { postSessionAttendance } from "@/api/postSessionAttendance";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, CourseSession, Enrollment, SessionAttendance } from "@/api/types";
import { AttendanceStatusPicker } from "@/components/events/attendance-status-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { formatDateTime } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

function dateInputToMs(date: string, time: string): number | null {
  const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, dayRaw, monthRaw, yearRaw] = dateMatch;
  const [, hourRaw, minuteRaw] = timeMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d.getHours() !== hour || d.getMinutes() !== minute) return null;
  return d.getTime();
}

function msToDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function msToTimeInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ROLL_CALL_PAGE_SIZE = 8;

export function CourseSessionsPanel(props: {
  courseId: string;
  roster: Enrollment[];
  canManage: boolean;
  active: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [sessions, { refetch }] = createResource(
    () => (props.active || props.createOpen ? props.courseId : null),
    async (courseId) => (courseId ? (await getCourseSessions(courseId)).items : []),
  );
  const [selectedSession, setSelectedSession] = createSignal<CourseSession | null>(null);
  const [editingSession, setEditingSession] = createSignal<CourseSession | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<CourseSession | null>(null);
  const [topic, setTopic] = createSignal("");
  const [startsDate, setStartsDate] = createSignal("");
  const [startsTime, setStartsTime] = createSignal("");
  const [endsDate, setEndsDate] = createSignal("");
  const [endsTime, setEndsTime] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));

  const resetForm = () => {
    setTopic("");
    setStartsDate("");
    setStartsTime("");
    setEndsDate("");
    setEndsTime("");
    setError("");
    setEditingSession(null);
  };

  const startEdit = (session: CourseSession) => {
    setEditingSession(session);
    setTopic(session.topic || "");
    setStartsDate(msToDateInput(session.starts_at));
    setStartsTime(msToTimeInput(session.starts_at));
    setEndsDate(session.ends_at != null ? msToDateInput(session.ends_at) : "");
    setEndsTime(session.ends_at != null ? msToTimeInput(session.ends_at) : "");
    setError("");
    props.onCreateOpenChange(false);
  };

  const parseSchedule = () => {
    const starts_at = dateInputToMs(startsDate(), startsTime());
    const ends_at = endsDate().trim() || endsTime().trim() ? dateInputToMs(endsDate(), endsTime()) : null;
    if (starts_at == null) {
      setError(t("sessions.startRequired"));
      return null;
    }
    if ((endsDate().trim() || endsTime().trim()) && ends_at == null) {
      setError(t("sessions.endInvalid"));
      return null;
    }
    if (ends_at != null && ends_at < starts_at) {
      setError(t("form.timeOrder"));
      return null;
    }
    return { starts_at, ends_at };
  };

  const saveSession = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    const schedule = parseSchedule();
    if (!schedule) return;
    const { starts_at, ends_at } = schedule;
    const current = editingSession();
    const now = serverTime()?.now ?? Date.now();
    // Only newly set times must not be past (backend rule).
    if (!current || starts_at !== current.starts_at) {
      if (starts_at < now) {
        setError(t("form.timePast"));
        return;
      }
    }
    if (ends_at != null && (!current || ends_at !== current.ends_at) && ends_at < now) {
      setError(t("form.timePast"));
      return;
    }
    setPending(true);
    try {
      if (current) {
        await patchSessionById(current.id, {
          topic: topic().trim() || "",
          starts_at,
          ends_at,
        });
      } else {
        await postCourseSession(props.courseId, {
          starts_at,
          ...(topic().trim() ? { topic: topic().trim() } : {}),
          ...(ends_at != null ? { ends_at } : {}),
        });
      }
      resetForm();
      props.onCreateOpenChange(false);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const panelOpen = () => props.createOpen || editingSession() != null;

  return (
    <div class="space-y-4">
      {error() && <Alert variant="destructive">{error()}</Alert>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={sessions.error}>
          <ErrorAlert message={formatApiError(sessions.error)} onRetry={() => void refetch()} />
        </Show>
        <Show when={(sessions() ?? []).length > 0} fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("sessions.empty")}</div>}>
          <div class="space-y-3">
            <For each={sessions() ?? []}>
              {(session) => (
                <article class="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 class="font-medium">{session.topic || t("sessions.untitled")}</h3>
                      <p class="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(session.starts_at, locale())} {session.ends_at ? `- ${formatDateTime(session.ends_at, locale())}` : ""}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">{t("sessions.teacher")}: {personLabel(session.teacher)}</p>
                    </div>
                    <div class="flex gap-2">
                      <Show when={props.canManage}>
                        <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setSelectedSession(session)}>
                          {t("sessions.rollCall")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="rounded-lg"
                          aria-label={t("common.edit")}
                          onClick={() => startEdit(session)}
                        >
                          <IconEdit class="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="rounded-lg text-destructive hover:text-destructive"
                          aria-label={t("common.delete")}
                          onClick={() => setDeleteTarget(session)}
                        >
                          <IconTrash class="h-4 w-4" />
                        </Button>
                      </Show>
                    </div>
                  </div>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Suspense>

      <SidePanel
        open={panelOpen()}
        onOpenChange={(open) => {
          if (!open) {
            props.onCreateOpenChange(false);
            resetForm();
          } else if (!editingSession()) {
            props.onCreateOpenChange(true);
          }
        }}
        title={editingSession() ? t("sessions.edit") : t("sessions.add")}
        description={t("sessions.subtitle")}
      >
        <form class="space-y-4" onSubmit={saveSession}>
          <div class="space-y-1.5">
            <Label for="session-topic">{t("sessions.topic")}</Label>
            <Input id="session-topic" value={topic()} maxlength={200} onInput={(e) => setTopic(e.currentTarget.value)} />
          </div>
          <div class="grid gap-3">
            <div class="space-y-1.5">
              <Label for="session-starts">{t("events.starts")}</Label>
              <div class="grid grid-cols-2 gap-2">
                <DatePicker id="session-starts" class="h-10" placeholder={t("form.datePlaceholder")} value={startsDate()} required onChange={setStartsDate} />
                <Input class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/35" placeholder="09:00" value={startsTime()} required onInput={(e) => setStartsTime(e.currentTarget.value)} />
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="session-ends">{t("events.ends")}</Label>
              <div class="grid grid-cols-2 gap-2">
                <DatePicker id="session-ends" class="h-10" placeholder={t("form.datePlaceholder")} value={endsDate()} onChange={setEndsDate} />
                <Input class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/35" placeholder="10:00" value={endsTime()} onInput={(e) => setEndsTime(e.currentTarget.value)} />
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              class="h-10 rounded-lg"
              onClick={() => {
                props.onCreateOpenChange(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
              {editingSession() ? t("common.update") : t("sessions.add")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        open={selectedSession() != null}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
        title={t("sessions.rollCall")}
        description={selectedSession() ? `${selectedSession()!.topic || t("sessions.untitled")} · ${formatDateTime(selectedSession()!.starts_at, locale())}` : undefined}
      >
        <Show when={selectedSession()}>
          {(session) => <RollCall sessionId={session().id} roster={props.roster} />}
        </Show>
      </SidePanel>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.deleteSession", { title: deleteTarget()?.topic || t("sessions.untitled") })}
        onConfirm={async () => {
          const session = deleteTarget();
          if (!session) return;
          try {
            await deleteSessionById(session.id);
            if (selectedSession()?.id === session.id) setSelectedSession(null);
            await refetch();
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

function RollCall(props: { sessionId: string; roster: Enrollment[] }) {
  const t = useT();
  const [attendance, { refetch }] = createResource(
    () => props.sessionId,
    async (sessionId) => (await getSessionAttendance(sessionId)).items,
  );
  const rows = createMemo(() => new Map((attendance() ?? []).map((row) => [row.user.id, row])));
  const [local, setLocal] = createSignal<Record<string, AttendanceStatus>>({});
  const [error, setError] = createSignal("");
  const [page, setPage] = createSignal(0);
  const totalPages = createMemo(() => Math.max(1, Math.ceil(props.roster.length / ROLL_CALL_PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const visibleRoster = createMemo(() => {
    const start = safePage() * ROLL_CALL_PAGE_SIZE;
    return props.roster.slice(start, start + ROLL_CALL_PAGE_SIZE);
  });

  createEffect(() => {
    if (page() >= totalPages()) setPage(totalPages() - 1);
  });

  const statusFor = (userId: string) => local()[userId] ?? rows().get(userId)?.status ?? "present";
  const save = async (userId: string) => {
    setError("");
    try {
      await postSessionAttendance(props.sessionId, { user_id: userId, status: statusFor(userId) });
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-3">
      {error() && <Alert variant="destructive">{error()}</Alert>}
      <Show
        when={props.roster.length > 0}
        fallback={<p class="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("sessions.emptyRoster")}</p>}
      >
        <For each={visibleRoster()}>
          {(row) => {
            const saved = () => rows().get(row.user.id) as SessionAttendance | undefined;
            return (
              <div class="space-y-2 rounded-lg border border-border/50 bg-card px-4 py-3">
                <div class="min-w-0">
                  <p class="truncate font-medium">{personLabel(row.user)}</p>
                  <p class="mono truncate text-xs text-muted-foreground">{row.user.id}</p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <AttendanceStatusPicker hideLabel hideDetail id={`session-${props.sessionId}-${row.user.id}`} value={statusFor(row.user.id)} onChange={(status) => setLocal((current) => ({ ...current, [row.user.id]: status }))} />
                  </div>
                  <Button type="button" class="h-10 w-24 shrink-0 rounded-lg" variant={saved() ? "outline" : "default"} onClick={() => void save(row.user.id)}>
                    {saved() ? t("common.update") : t("common.save")}
                  </Button>
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
