import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { deleteEventRegisterByUserId } from "@/api/events";
import { deleteEventAttendanceByUserId } from "@/api/events";
import { deleteEventById } from "@/api/events";
import { getEventAttendance } from "@/api/events";
import { getEventById } from "@/api/events";
import { getEventRoster } from "@/api/events";
import { postEventRegister } from "@/api/events";
import { formatApiError } from "@/api/client";
import type { EventAudience, EventRosterEntry } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { AttendanceTable } from "@/components/events/attendance-table";
import { EventEditPanel } from "@/components/events/event-edit-panel";
import { EventRollCall } from "@/components/events/event-roll-call";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOOLBAR_SLOT } from "@/components/ui/data-toolbar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { eventStatusLabelKey, isRollCallOpen } from "@/lib/event-roll-call";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { personId, personLabel } from "@/lib/person";
import { matchesSearch } from "@/lib/search-text";
import { hasMinRole } from "@/lib/roles";
import { createUrlString } from "@/lib/url-state";
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

  const [registrationUserId, setRegistrationUserId] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [registrationTarget, setRegistrationTarget] = createSignal<string | null>(null);
  const [rosterSearch, setRosterSearch] = createSignal("");
  const [eventTab, setEventTab] = createUrlString("tab", "studentAttendance");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");

  const [event, { refetch: refetchEvent }] = createResource(id, (eventId) => getEventById(eventId));
  // The expected-attendee roster, resolved by the backend from the event's
  // audience (whole school, a role, a course, or the signup list) and joined
  // with each person's recorded mark. It feeds both the signup list and roll call.
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (isTeacherPlus() && event() ? id() : null),
    async (eventId) => (eventId ? (await getEventRoster(eventId)).items : []),
  );
  const [attendance, { refetch: refetchAttendance }] = createResource(
    () => (isTeacherPlus() ? id() : null),
    async (eventId) => (eventId ? (await getEventAttendance(eventId)).items : []),
  );
  const visibleRoster = createMemo(() => {
    const query = rosterSearch().trim();
    const rows = roster() ?? [];
    return query ? rows.filter((row) => matchesSearch(query, personLabel(row.user))) : rows;
  });

  const canManage = () => {
    const e = event();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };
  const [flash, setFlash] = createFlash();
  const now = createNow();
  const rollCallOpen = () => isRollCallOpen(event()?.starts_at, now());
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
        const key = status ? eventStatusLabelKey(status) ?? meta?.key : null;
        return status ? (
          <Badge variant="outline" class={cn("gap-1 rounded-full border px-2.5 py-1 normal-case", meta?.class)}>
            {key ? t(key) : status}
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
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
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
          <div class="space-y-5">
            <section class="rounded-xl border border-border-line bg-surface-base px-4 py-3 shadow-xs sm:px-5">
              <Breadcrumbs items={[{ label: t("events.title"), to: "/events" }, { label: ev().title }]} />
              <PageHeader
                title={ev().title}
                description={ev().description || undefined}
                actions={
                  canManage() ? (
                    <div class={cn("detail-action-group", TOOLBAR_SLOT)}>
                      <Button type="button" variant="outline" size="sm" class="flex-1 sm:flex-none" onClick={() => setEditing(true)}>
                        <IconEdit class="h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                      <TableRowActions
                        label={t("common.actions")}
                        actions={[{
                          label: t("common.delete"),
                          icon: <IconTrash class="h-4 w-4" />,
                          destructive: true,
                          disabled: pending(),
                          onSelect: () => setDeleteOpen(true),
                        }]}
                      />
                    </div>
                  ) : undefined
                }
              />
              <div class="grid gap-3 border-t border-border-hairline pt-3 text-sm sm:grid-cols-3">
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.audience")}</p>
                  <p class="mt-1 font-medium">{audienceLabel(ev().audience, t)}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ev().starts_at, locale())}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ev().ends_at, locale())}</p>
                </div>
              </div>
            </section>

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

            <EventEditPanel
              event={ev()}
              open={editing()}
              onOpenChange={setEditing}
              onSaved={async () => {
                await refetchEvent();
                setFlash(t("common.saved"));
              }}
            />

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

            <Show when={isTeacherPlus()}>
              <Tabs value={eventTab()} onChange={setEventTab} class="space-y-4">
                <TabsList class={cn("w-full justify-start gap-0 overflow-x-auto rounded-lg border-border-line bg-surface-base p-0 shadow-none sm:grid", ev().audience.kind === "registration" ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  <Show when={ev().audience.kind === "registration"}>
                    <TabsTrigger value="registration" class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none">{t("events.registrationRoster")}</TabsTrigger>
                  </Show>
                  <TabsTrigger value="studentAttendance" class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none">{t("events.studentAttendance")}</TabsTrigger>
                  <TabsTrigger value="attendanceRecords" class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none">{t("events.attendanceRecords")}</TabsTrigger>
                </TabsList>

                <Show when={ev().audience.kind === "registration"}>
                  <TabsContent value="registration" forceMount class="space-y-3">
                    <div class="rounded-xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4">
                      <p class="mb-3 text-sm text-muted-foreground">{t("events.registrationRosterHelp")}</p>
                      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <UserSearchSelect id="registration-user" label={t("events.attendee")} value={registrationUserId()} placeholder={t("events.selectAttendee")} emptyMessage={t("events.noAttendees")} role="student" onChange={setRegistrationUserId} />
                      <Button
                        type="button"
                        class="rounded-xl"
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
                    </div>
                    <Suspense fallback={<DataTableSkeleton columns={4} />}>
                      <Show when={roster()}>
                        <Show when={(roster() ?? []).length > 0} fallback={<EmptyState kind="events" title={t("events.noRoster")} />}>
                          <DataTable
                            columns={rosterColumns()}
                            data={visibleRoster()}
                            searchValue={rosterSearch()}
                            onSearchInput={setRosterSearch}
                            filterPlaceholder={t("common.searchPlaceholder")}
                            enablePagination
                            pageSize={10}
                          />
                        </Show>
                      </Show>
                    </Suspense>
                  </TabsContent>
                </Show>

                <TabsContent value="studentAttendance" forceMount class="space-y-3">
                  <Suspense fallback={<DataTableSkeleton columns={2} />}>
                    <Show when={roster()} fallback={
                      <Show when={roster.error}>
                        <Alert variant="destructive">{formatApiError(roster.error)}</Alert>
                      </Show>
                    }>
                      {(rows) => (
                        <EventRollCall
                          eventId={id()}
                          roster={rows()}
                          open={rollCallOpen()}
                          closedReason={t("events.rollCall.opensAt", { date: formatDateTime(ev().starts_at, locale()) })}
                          help={t("events.studentAttendanceHelp")}
                          onSaved={() => Promise.all([refetchRoster(), refetchAttendance()])}
                        />
                      )}
                    </Show>
                  </Suspense>
                </TabsContent>

                <TabsContent value="attendanceRecords" forceMount class="space-y-3">
                  <Suspense fallback={<DataTableSkeleton columns={4} />}>
                    <Show when={attendance()}>
                      {(rows) => (
                        <div class="space-y-3">
                          <AttendanceTable
                            rows={rows()}
                            markedByInfo={t("events.attendanceRecordsHelp")}
                            emptyLabel={t("events.noAttendance")}
                            canRemove={isTeacherPlus()}
                            onRemove={async (userId) => {
                              await wrap(async () => {
                                await deleteEventAttendanceByUserId(id(), userId);
                                await refetchAttendance();
                              }, t("common.deleted"));
                            }}
                          />
                        </div>
                      )}
                    </Show>
                  </Suspense>
                </TabsContent>
              </Tabs>
            </Show>

            <Show when={flash()}>
              <Alert variant="success">{flash()}</Alert>
            </Show>
            {error() && (
              <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
            )}
          </div>
        )}
      </Show>
    </Suspense>
  );
}
