import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteSessionById } from "@/api/sessions";
import { getSessionAttendance } from "@/api/sessions";
import { getInstanceSessions, postInstanceSession } from "@/api/instances";
import { getTime } from "@/api/time";
import { patchSessionById } from "@/api/sessions";
import { formatApiError } from "@/api/client";
import type { CourseSession, Enrollment, PersonRef } from "@/api/client";
import { SessionRollCall } from "@/components/sessions/session-roll-call";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DetailField } from "@/components/ui/detail-field";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconClipboardCheck, IconEdit, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { LIST_CAP, loadWindowedList } from "@/lib/capped-list";
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

export function CourseSessionsPanel(props: {
  /** The instance (class x course) these lessons belong to. */
  instanceId: string;
  roster: Enrollment[];
  teachers: PersonRef[];
  canManage: boolean;
  canManageStaff: boolean;
  active: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
  /** Open this session's roll call once the list has it (a deep link). */
  openRollCallFor?: string;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [sessions, { refetch }] = createResource(
    () => (props.active ? props.instanceId : null),
    async (instanceId) => {
      if (!instanceId) return [];
      // The table lists the section's whole lesson history, so the window is
      // unfiltered — but the read is still paged: offsets are followed until
      // the envelope total instead of one unpaged GET of every session ever.
      const list = await loadWindowedList((params) => getInstanceSessions(instanceId, params), LIST_CAP);
      return list.items;
    },
  );
  const [selectedSession, setSelectedSession] = createSignal<CourseSession | null>(null);
  let linkedRollCallOpened = false;
  createEffect(() => {
    const target = props.openRollCallFor;
    const list = sessions.latest;
    if (!target || !list || linkedRollCallOpened) return;
    const session = list.find((row) => row.id === target);
    if (session && props.canManage) {
      linkedRollCallOpened = true;
      setSelectedSession(session);
    }
  });
  const [detailSession, setDetailSession] = createSignal<CourseSession | null>(null);
  const [editingSession, setEditingSession] = createSignal<CourseSession | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<CourseSession | null>(null);
  const [topic, setTopic] = createSignal("");
  const [startsDate, setStartsDate] = createSignal("");
  const [startsTime, setStartsTime] = createSignal("");
  const [endsDate, setEndsDate] = createSignal("");
  const [endsTime, setEndsTime] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [detailAttendance] = createResource(
    () => (props.canManage ? detailSession()?.id ?? null : null),
    async (sessionId) => (await getSessionAttendance(sessionId)).items,
  );
  const teacherOptions = createMemo(() => {
    const current = editingSession()?.teacher;
    if (!current || props.teachers.some((teacher) => teacher.id === current.id)) return props.teachers;
    return [current, ...props.teachers];
  });
  const attendanceTargetCount = (session: CourseSession) => {
    const teacherIsStudent = props.roster.some((row) => row.user.id === session.teacher.id);
    const teacherHasRow = detailAttendance()?.some((row) => row.user.id === session.teacher.id) ?? false;
    return props.roster.length + (!teacherIsStudent && (props.canManageStaff || teacherHasRow) ? 1 : 0);
  };

  const resetForm = () => {
    setTopic("");
    setStartsDate("");
    setStartsTime("");
    setEndsDate("");
    setEndsTime("");
    setTeacherId("");
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
    setTeacherId(session.teacher.id);
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
          teacher_id: teacherId(),
          starts_at,
          ends_at,
        });
        setFlash(t("common.saved"));
      } else {
        await postInstanceSession(props.instanceId, {
          starts_at,
          ...(topic().trim() ? { topic: topic().trim() } : {}),
          ...(teacherId() ? { teacher_id: teacherId() } : {}),
          ...(ends_at != null ? { ends_at } : {}),
        });
        setFlash(t("common.created"));
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
  createEffect(() => props.onCountChange(sessions()?.length ?? 0));
  const columns = createMemo<ColumnDef<CourseSession>[]>(() => [
    {
      accessorKey: "topic",
      header: t("sessions.topic"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => cell.row.original.topic || t("sessions.untitled"),
    },
    // Start and end are separate columns so each cell holds one value and
    // every row keeps the same height.
    {
      id: "starts",
      accessorFn: (row) => row.starts_at,
      header: t("appointments.starts"),
      meta: { cellClass: "text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.starts_at, locale()),
    },
    {
      id: "ends",
      accessorFn: (row) => row.ends_at ?? undefined,
      header: t("appointments.ends"),
      meta: { cellClass: "text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.ends_at, locale()),
    },
    {
      id: "teacher",
      accessorFn: (row) => personLabel(row.teacher),
      header: t("sessions.teacher"),
      cell: (cell) => personLabel(cell.row.original.teacher),
    },
    ...(props.canManage
      ? [{
          id: "actions",
          header: t("common.actions"),
          meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
          cell: (cell) => (
            <TableRowActions
              label={t("common.actions")}
              actions={[
                { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setDetailSession(cell.row.original) },
                { label: t("sessions.rollCall"), icon: <IconClipboardCheck class="h-4 w-4" />, onSelect: () => setSelectedSession(cell.row.original) },
                { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => startEdit(cell.row.original) },
                { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
              ]}
            />
          ),
        } satisfies ColumnDef<CourseSession>]
      : []),
  ]);

  return (
    <div class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !panelOpen()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Suspense fallback={<DataTableSkeleton />}>
        <Show when={sessions.error}>
          <ErrorAlert message={formatApiError(sessions.error)} onRetry={() => void refetch()} />
        </Show>
        <DataTable
          columns={columns()}
          data={sessions() ?? []}
          filterColumn="topic"
          storageKey={`instance-sessions-${props.instanceId}`}
          enablePagination
          pageSize={10}
          empty={t("sessions.empty")}
          onRowClick={setDetailSession}
          actions={props.canManage ? (
            <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => props.onCreateOpenChange(true)}>
              <IconPlus class="h-4 w-4" />{t("sessions.add")}
            </Button>
          ) : undefined}
        />
      </Suspense>

      <SidePanel guardUnsaved
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
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="session-topic">{t("sessions.topic")}</Label>
            <Input id="session-topic" value={topic()} maxlength={200} onInput={(e) => setTopic(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="session-teacher">{t("sessions.teacher")}</Label>
            <Select
              id="session-teacher"
              value={teacherId()}
              onChange={(e) => setTeacherId(e.currentTarget.value)}
            >
              <Show when={!editingSession()}>
                <option value="">{t("sessions.defaultTeacher")}</option>
              </Show>
              <For each={teacherOptions()}>
                {(teacher) => <option value={teacher.id}>{personLabel(teacher)}</option>}
              </For>
            </Select>
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
        open={detailSession() != null}
        onOpenChange={(open) => { if (!open) setDetailSession(null); }}
        title={detailSession()?.topic || t("sessions.untitled")}
        description={detailSession() ? formatDateTime(detailSession()!.starts_at, locale()) : ""}
      >
        <Show when={detailSession()} keyed>
          {(session) => (
            <div class="space-y-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("sessions.teacher")} value={personLabel(session.teacher)} />
                <DetailField label={t("events.starts")} value={formatDateTime(session.starts_at, locale())} />
                <DetailField label={t("events.ends")} value={formatDateTime(session.ends_at, locale())} />
                <Show when={props.canManage}>
                  <DetailField label={t("attendance.title")} value={`${detailAttendance()?.length ?? 0} / ${attendanceTargetCount(session)}`} />
                </Show>
              </div>
              <Show when={props.canManage}>
                <div class="flex gap-2">
                  <Button variant="outline" onClick={() => { setDetailSession(null); startEdit(session); }}>
                    <IconEdit class="h-4 w-4" />
                    {t("common.edit")}
                  </Button>
                  <Button onClick={() => { setDetailSession(null); setSelectedSession(session); }}>
                    <IconClipboardCheck class="h-4 w-4" />
                    {t("sessions.rollCall")}
                  </Button>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </SidePanel>

      <SidePanel
        open={selectedSession() != null}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null);
        }}
        title={t("sessions.rollCall")}
        size="wide"
        description={selectedSession() ? `${selectedSession()!.topic || t("sessions.untitled")} · ${formatDateTime(selectedSession()!.starts_at, locale())}` : undefined}
      >
        <Show when={selectedSession()}>
          {(session) => (
            <SessionRollCall
              sessionId={session().id}
              roster={props.roster}
              teacher={session().teacher}
              canMarkTeacher={props.canManageStaff}
            />
          )}
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
            if (detailSession()?.id === session.id) setDetailSession(null);
            await refetch();
            setFlash(t("common.deleted"));
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
