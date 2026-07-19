import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteEventRegisterByUserId } from "@/api/deleteEventRegisterByUserId";
import { deleteEventAttendanceByUserId } from "@/api/deleteEventAttendanceByUserId";
import { deleteEventById } from "@/api/deleteEventById";
import { getEventAttendance } from "@/api/getEventAttendance";
import { getEventById } from "@/api/getEventById";
import { getEventRoster } from "@/api/getEventRoster";
import { patchEventById } from "@/api/patchEventById";
import { postEventAttendance } from "@/api/postEventAttendance";
import { postEventRegister } from "@/api/postEventRegister";
import { formatApiError } from "@/api/client";
import type { AttendanceStatus, EventAudience, EventRosterEntry } from "@/api/types";
import type { MessageKey } from "@/i18n/messages";
import { AttendanceStatusPicker } from "@/components/events/attendance-status-picker";
import { AttendanceTable } from "@/components/events/attendance-table";
import { EventForm } from "@/components/events/event-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { IconChevronLeft, IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SectionDisclosure } from "@/components/ui/section-disclosure";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { personId, personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

function audienceLabel(audience: EventAudience, t: ReturnType<typeof useT>): string {
  if (audience.kind === "role") return `${t("events.audience.role")}: ${t(`role.${audience.role}` as MessageKey)}`;
  if (audience.kind === "course") return t("events.audience.course");
  if (audience.kind === "registration") return t("events.audience.registration");
  return t("events.audience.school");
}

export default function EventDetailPage() {
  return (
    <RouteGuard>
      <EventDetailContent />
    </RouteGuard>
  );
}

function EventDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/events/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  const [status, setStatus] = createSignal<AttendanceStatus>("present");
  const [otherUserId, setOtherUserId] = createSignal("");
  const [registrationUserId, setRegistrationUserId] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [registrationOpen, setRegistrationOpen] = createSignal(false);
  const [registrationTarget, setRegistrationTarget] = createSignal<string | null>(null);
  const [studentAttendanceOpen, setStudentAttendanceOpen] = createSignal(false);
  const [attendanceOpen, setAttendanceOpen] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");

  const [event, { refetch: refetchEvent }] = createResource(id, (eventId) => getEventById(eventId));
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (isTeacherPlus() && event()?.audience.kind === "registration" && registrationOpen() ? id() : null),
    async (eventId) => (eventId ? (await getEventRoster(eventId)).items : []),
  );
  const [attendance, { refetch: refetchAttendance }] = createResource(
    () => (isTeacherPlus() && attendanceOpen() ? id() : null),
    async (eventId) => (eventId ? (await getEventAttendance(eventId)).items : []),
  );

  const canManage = () => {
    const e = event();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };
  const [flash, setFlash] = createFlash();
  const rosterColumns = createMemo<ColumnDef<EventRosterEntry>[]>(() => [
    {
      id: "attendee",
      accessorFn: (row) => personLabel(row.user),
      header: t("events.attendee"),
      cell: (cell) => <span class="font-medium">{personLabel(cell.row.original.user)}</span>,
    },
    {
      id: "status",
      accessorFn: (row) => row.status ?? "",
      header: t("events.status"),
      cell: (cell) => {
        const status = cell.row.original.status;
        const meta = status ? getAttendanceStatusMeta(status) : null;
        return status ? (
          <Badge variant="outline" class={cn("gap-1 rounded-full border px-2.5 py-1 normal-case", meta?.class)}>
            {meta ? t(meta.key) : status}
          </Badge>
        ) : <span class="text-sm text-muted-foreground">{t("events.notMarked")}</span>;
      },
    },
    {
      id: "marked_by",
      accessorFn: (row) => row.marked_by ? personLabel(row.marked_by) : "",
      header: t("events.markedBy"),
      cell: (cell) => <span class="text-sm text-muted-foreground">{cell.row.original.marked_by ? personLabel(cell.row.original.marked_by) : "—"}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("events.unregister"),
            icon: <IconTrash class="h-4 w-4" />,
            destructive: true,
            onSelect: () => setRegistrationTarget(personId(cell.row.original.user)),
          }]}
        />
      ),
    },
  ]);

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setError("");
    setPending(true);
    try {
      await fn();
      if (ok) setFlash(ok);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={event()?.id === id() ? event() : undefined}
        fallback={
          <Show when={event.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(event.error)}</Alert>
          </Show>
        }
      >
        {(ev) => (
          <div class="space-y-6">
            <div class="space-y-2">
              <PageHeader
                accent="sky"
                eyebrow={t("events.title")}
                title={ev().title}
                description={ev().description || "—"}
                actions={
                  <div class="detail-action-group">
                    <Link to="/events">
                      <Button variant="ghost" size="sm" class="w-full rounded-sm sm:w-auto">
                        <IconChevronLeft class="h-4 w-4" />
                        {t("common.back")}
                      </Button>
                    </Link>
                    <Show when={canManage()}>
                      <div class="detail-action-divider">
                        <Button type="button" variant="outline" size="sm" class="flex-1 rounded-sm sm:flex-none" onClick={() => setEditing(true)}>
                          <IconEdit class="h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                        <Button type="button" variant="destructive" size="sm" class="flex-1 rounded-sm sm:flex-none" disabled={pending()} onClick={() => setDeleteOpen(true)}>
                          <IconTrash class="h-4 w-4" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    </Show>
                  </div>
                }
              />
              <div class="grid gap-3 text-sm sm:grid-cols-3">
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.audience")}</p>
                  <p class="mt-1 font-medium">{audienceLabel(ev().audience, t)}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</p>
                  <p class="mono mt-1 font-medium">{formatDateTime(ev().starts_at, locale())}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</p>
                  <p class="mono mt-1 font-medium">{formatDateTime(ev().ends_at, locale())}</p>
                </div>
              </div>
            </div>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.deleteEvent", { title: ev().title })}
              onConfirm={async () => {
                await wrap(async () => {
                  await deleteEventById(id());
                  void navigate({ to: "/events" });
                });
              }}
            />

            <SidePanel
              open={editing()}
              onOpenChange={setEditing}
              title={t("common.edit")}
              description={ev().title}
            >
              <EventForm
                initial={ev()}
                submitLabel={t("common.update")}
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  const body: Record<string, unknown> = {
                    title: values.title,
                    description: values.description,
                    audience: values.audience,
                  };
                  if (values.starts_at !== undefined) body.starts_at = values.starts_at;
                  if (values.ends_at !== undefined) body.ends_at = values.ends_at;
                  await patchEventById(id(), body);
                  setEditing(false);
                  await refetchEvent();
                  setFlash(t("common.saved"));
                }}
              />
            </SidePanel>

            <ConfirmDialog
              open={registrationTarget() != null}
              onOpenChange={(open) => {
                if (!open) setRegistrationTarget(null);
              }}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.removeEventRegistration", { user: registrationTarget() ?? "" })}
              onConfirm={async () => {
                const userId = registrationTarget();
                if (!userId) return;
                await wrap(async () => {
                  await deleteEventRegisterByUserId(id(), userId);
                  await refetchRoster();
                }, t("common.deleted"));
                setRegistrationTarget(null);
              }}
            />

            <Show when={isTeacherPlus() && ev().audience.kind === "registration"}>
              <SectionDisclosure
                open={registrationOpen()}
                onToggle={() => setRegistrationOpen((open) => !open)}
                title={t("events.registrationRoster")}
                description={t("events.registrationRosterHelp")}
              >
                <div class="space-y-3">
                  <div class="grid gap-3 rounded-lg border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <UserSearchSelect
                      id="registration-user"
                      label={t("events.attendee")}
                      value={registrationUserId()}
                      placeholder={t("events.selectAttendee")}
                      emptyMessage={t("events.noAttendees")}
                      role="student"
                      onChange={setRegistrationUserId}
                    />
                    <Button
                      type="button"
                      class="rounded-sm"
                      disabled={pending()}
                      onClick={() => {
                        const uid = registrationUserId().trim();
                        if (!uid) {
                          setError(t("events.userIdRequired"));
                          return;
                        }
                        void wrap(async () => {
                          await postEventRegister(id(), { user_id: uid });
                          setRegistrationUserId("");
                          await refetchRoster();
                        }, t("common.saved"));
                      }}
                    >
                      {t("events.registerStudent")}
                    </Button>
                  </div>
                  <Suspense fallback={<PageSpinner />}>
                    <Show when={roster()}>
                      {(rows) => (
                        <Show
                          when={rows().length > 0}
                          fallback={<p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("events.noRoster")}</p>}
                        >
                          <DataTable columns={rosterColumns()} data={rows()} filterColumn="attendee" enablePagination pageSize={10} />
                        </Show>
                      )}
                    </Show>
                  </Suspense>
                </div>
              </SectionDisclosure>
            </Show>

            <Show when={isTeacherPlus()}>
              <SectionDisclosure
                open={studentAttendanceOpen()}
                onToggle={() => setStudentAttendanceOpen((open) => !open)}
                title={t("events.studentAttendance")}
                description={t("events.studentAttendanceHelp")}
              >
                <div class="grid gap-3">
                  <UserSearchSelect
                    id="other-user"
                    label={t("events.attendee")}
                    value={otherUserId()}
                    placeholder={t("events.selectAttendee")}
                    emptyMessage={t("events.noAttendees")}
                    role="student"
                    onChange={setOtherUserId}
                  />
                  <AttendanceStatusPicker
                    id="other-status"
                    value={status()}
                    onChange={setStatus}
                    label={t("events.status")}
                  />
                  <Button
                    type="button"
                    class="w-full rounded-sm sm:w-auto"
                    disabled={pending()}
                    onClick={() => {
                      const uid = otherUserId().trim();
                      if (!uid) {
                        setError(t("events.userIdRequired"));
                        return;
                      }
                      void wrap(async () => {
                        await postEventAttendance(id(), {
                          status: status(),
                          user_id: uid,
                        });
                        setOtherUserId("");
                        if (attendanceOpen()) await refetchAttendance();
                      }, t("common.saved"));
                    }}
                  >
                    {t("events.saveStudentAttendance")}
                  </Button>
                </div>
              </SectionDisclosure>
            </Show>

            <Show when={flash()}>
              <Alert variant="success">{flash()}</Alert>
            </Show>
            {error() && (
              <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <Show when={isTeacherPlus()}>
              <SectionDisclosure
                open={attendanceOpen()}
                onToggle={() => setAttendanceOpen((open) => !open)}
                title={t("events.attendanceRecords")}
                description={t("events.attendanceRecordsHelp")}
              >
                <Suspense fallback={<PageSpinner />}>
                  <Show when={attendance()}>
                    {(rows) => (
                      <AttendanceTable
                        rows={rows()}
                        emptyLabel={t("events.noAttendance")}
                        canRemove={isTeacherPlus()}
                        onRemove={async (userId) => {
                          await wrap(async () => {
                            await deleteEventAttendanceByUserId(id(), userId);
                            await refetchAttendance();
                          }, t("common.deleted"));
                        }}
                      />
                    )}
                  </Show>
                </Suspense>
              </SectionDisclosure>
            </Show>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
