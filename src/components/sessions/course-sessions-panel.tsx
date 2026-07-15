import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteSessionById } from "@/api/deleteSessionById";
import { getCourseSessions } from "@/api/getCourseSessions";
import { getSessionAttendance } from "@/api/getSessionAttendance";
import { postCourseSession } from "@/api/postCourseSession";
import { postSessionAttendance } from "@/api/postSessionAttendance";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, Enrollment, SessionAttendance } from "@/api/types";
import { AttendanceStatusPicker } from "@/components/events/attendance-status-picker";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
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

export function CourseSessionsPanel(props: { courseId: string; roster: Enrollment[]; canManage: boolean }) {
  const t = useT();
  const { locale } = usePreferences();
  const [sessions, { refetch }] = createResource(() => props.courseId, (courseId) => getCourseSessions(courseId));
  const [openSessionId, setOpenSessionId] = createSignal<string | null>(null);
  const [topic, setTopic] = createSignal("");
  const [startsDate, setStartsDate] = createSignal("");
  const [startsTime, setStartsTime] = createSignal("");
  const [endsDate, setEndsDate] = createSignal("");
  const [endsTime, setEndsTime] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const createSession = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    const starts_at = dateInputToMs(startsDate(), startsTime());
    const ends_at = endsDate().trim() || endsTime().trim() ? dateInputToMs(endsDate(), endsTime()) : null;
    if (starts_at == null) {
      setError(t("sessions.startRequired"));
      return;
    }
    if ((endsDate().trim() || endsTime().trim()) && ends_at == null) {
      setError(t("sessions.endInvalid"));
      return;
    }
    if (ends_at != null && ends_at < starts_at) {
      setError(t("form.timeOrder"));
      return;
    }
    setPending(true);
    try {
      await postCourseSession(props.courseId, { topic: topic().trim() || null, starts_at, ends_at });
      setTopic("");
      setStartsDate("");
      setStartsTime("");
      setEndsDate("");
      setEndsTime("");
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section class="surface-card space-y-4 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="font-display text-lg font-semibold">{t("sessions.title")}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("sessions.subtitle")}</p>
        </div>
        <Badge variant="secondary" class="rounded-full px-3 py-1">{sessions()?.length ?? 0}</Badge>
      </div>

      {error() && <Alert variant="destructive">{error()}</Alert>}

      <Show when={props.canManage}>
        <form class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={createSession}>
          <div class="space-y-1.5">
            <Label for="session-topic">{t("sessions.topic")}</Label>
            <Input id="session-topic" value={topic()} maxlength={200} onInput={(e) => setTopic(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="session-starts">{t("events.starts")}</Label>
            <div class="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
              <DatePicker id="session-starts" placeholder={t("form.datePlaceholder")} value={startsDate()} required onChange={setStartsDate} />
              <Input class="font-mono" placeholder="09:00" value={startsTime()} required onInput={(e) => setStartsTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="session-ends">{t("events.ends")}</Label>
            <div class="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
              <DatePicker id="session-ends" placeholder={t("form.datePlaceholder")} value={endsDate()} onChange={setEndsDate} />
              <Input class="font-mono" placeholder="10:00" value={endsTime()} onInput={(e) => setEndsTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="flex items-end">
            <Button type="submit" disabled={pending()}>
              <IconPlus class="h-4 w-4" />
              {t("sessions.add")}
            </Button>
          </div>
        </form>
      </Show>

      <Suspense fallback={<PageSpinner />}>
        <Show when={sessions.error}>
          <Alert variant="destructive">{formatApiError(sessions.error)}</Alert>
        </Show>
        <Show when={(sessions() ?? []).length > 0} fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("sessions.empty")}</div>}>
          <div class="space-y-3">
            <For each={sessions() ?? []}>
              {(session) => (
                <article class="rounded-lg border bg-background/60 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 class="font-medium">{session.topic || t("sessions.untitled")}</h3>
                      <p class="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(session.starts_at, locale())} {session.ends_at ? `- ${formatDateTime(session.ends_at, locale())}` : ""}
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">{t("sessions.teacher")}: {personLabel(session.teacher)}</p>
                    </div>
                    <div class="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setOpenSessionId(openSessionId() === session.id ? null : session.id)}>
                        {t("sessions.rollCall")}
                      </Button>
                      <Show when={props.canManage}>
                        <Button type="button" variant="ghost" size="sm" class="text-destructive hover:text-destructive" onClick={async () => { await deleteSessionById(session.id); await refetch(); }}>
                          <IconTrash class="h-4 w-4" />
                        </Button>
                      </Show>
                    </div>
                  </div>
                  <Show when={openSessionId() === session.id}>
                    <RollCall sessionId={session.id} roster={props.roster} />
                  </Show>
                </article>
              )}
            </For>
          </div>
        </Show>
      </Suspense>
    </section>
  );
}

function RollCall(props: { sessionId: string; roster: Enrollment[] }) {
  const t = useT();
  const [attendance, { refetch }] = createResource(() => props.sessionId, (sessionId) => getSessionAttendance(sessionId));
  const rows = createMemo(() => new Map((attendance() ?? []).map((row) => [row.user.id, row])));
  const [local, setLocal] = createSignal<Record<string, AttendanceStatus>>({});
  const [error, setError] = createSignal("");

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
    <div class="mt-4 space-y-3 border-t pt-4">
      {error() && <Alert variant="destructive">{error()}</Alert>}
      <For each={props.roster}>
        {(row) => {
          const saved = () => rows().get(row.user.id) as SessionAttendance | undefined;
          return (
            <div class="grid gap-2 rounded-md border bg-muted/15 p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
              <div>
                <p class="font-medium">{personLabel(row.user)}</p>
                <p class="font-mono text-xs text-muted-foreground">{row.user.id}</p>
              </div>
              <AttendanceStatusPicker id={`session-${props.sessionId}-${row.user.id}`} value={statusFor(row.user.id)} onChange={(status) => setLocal((current) => ({ ...current, [row.user.id]: status }))} />
              <Button type="button" variant={saved() ? "outline" : "default"} onClick={() => void save(row.user.id)}>
                {saved() ? t("common.update") : t("common.save")}
              </Button>
            </div>
          );
        }}
      </For>
    </div>
  );
}
