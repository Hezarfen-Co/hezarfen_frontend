import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  deleteSlotById,
  deleteSlotSeries,
  getAppointments,
  getSlots,
  patchAcceptReschedule,
  patchApproveAppointment,
  patchCancelAppointment,
  patchDeclineReschedule,
  patchRejectAppointment,
  patchRescheduleAppointment,
  postAppointment,
  postSlots,
} from "@/api/appointments";
import { APPOINTMENT_LIMITS, formatApiError } from "@/api/client";
import { createLivePoll } from "@/lib/create-live-poll";
import type { Appointment, AppointmentSlot, AppointmentStatus } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import { PublishSlotsForm } from "@/components/appointments/publish-slots-form";
import { RescheduleForm } from "@/components/appointments/reschedule-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DetailField } from "@/components/ui/detail-field";
import { IconCalendarDays, IconCalendarX, IconCheck, IconClock, IconEye, IconPlus, IconRefresh, IconTrash, IconX } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appointmentActions, hasStandingProposal } from "@/lib/appointment-actions";
import { appointmentStatusClass, appointmentStatusDotClass, appointmentStatusLabelKey } from "@/lib/appointment-status";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { createNow } from "@/lib/create-now";
import { formatDate, formatDateTime } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const PAGE_SIZE = 10;
const PAGE_LIMIT = 100;
const isLive = (status: AppointmentStatus) => status === "pending" || status === "approved";

export default function AppointmentsPage() {
  return (
    <RouteGuard>
      <AppointmentsContent />
    </RouteGuard>
  );
}

function AppointmentsContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const [error, setError] = createSignal("");
  const [, setFlash] = createFlash();
  const [showPublish, setShowPublish] = createSignal(false);
  const [section, setSection] = createSignal<"appointments" | "availability">("appointments");
  const [bookSlot, setBookSlot] = createSignal<AppointmentSlot | null>(null);
  const [reschedAppt, setReschedAppt] = createSignal<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = createSignal<Appointment | null>(null);
  const [detailSlot, setDetailSlot] = createSignal<AppointmentSlot | null>(null);
  const [confirm, setConfirm] = createSignal<{ summary: string; run: (reason?: string) => Promise<unknown>; title?: string; confirmLabel?: string; icon?: import("solid-js").JSX.Element; prompt?: { label: string; placeholder?: string; maxLength?: number } } | null>(null);

  const me = () => auth.user();
  const isStaff = () => hasMinRole(me()?.role, "teacher");
  const isManager = () => hasMinRole(me()?.role, "manager");

  // Staff get EVERY slot they ever published (`list_for_teacher`, `starts_at ASC`,
  // no past filter), so past ~100 lifetime slots page one is nothing but expired
  // rows and the upcoming ones are unreachable. Take the last page instead — they
  // always sit at the tail. Requesters get `list_upcoming` (future-only, ASC), so
  // their first page is the near one and must stay first.
  // ponytail: shows the newest PAGE_LIMIT slots; >100 upcoming slots would need
  // real paging, and the endpoint takes only limit/offset today.
  const fetchSlots = async () => {
    const first = await getSlots({ limit: PAGE_LIMIT });
    if (!isStaff() || first.total <= PAGE_LIMIT) return first.items;
    return (await getSlots({ limit: PAGE_LIMIT, offset: first.total - PAGE_LIMIT })).items;
  };
  const [slots, { refetch: refetchSlots }] = createResource(fetchSlots);
  // Appointments come back newest-first (`ORDER BY id DESC`), so page one is right.
  const [appts, { refetch: refetchAppts }] = createResource(async () => (await getAppointments({ limit: PAGE_LIMIT })).items);

  const refetchAll = () => Promise.all([refetchSlots(), refetchAppts()]);
  const loaded = () => slots.latest !== undefined && appts.latest !== undefined;

  // Poll so statuses stay in sync when the other party acts (approve, book,
  // cancel…). Visibility-aware: pauses on hidden tabs, refetches on tab-back so
  // a cross-actor status change isn't stale on a parked tab. Reads use `.latest`,
  // so a refetch never re-suspends/blanks the tables. 30s (the primitive's
  // default): this page fans out to 2 GETs a tick, and tab-back freshness comes
  // from the visibility/focus wake, not from a short period.
  createLivePoll(refetchAll);
  const act = async (fn: () => Promise<unknown>, successKey?: MessageKey) => {
    setError("");
    try {
      await fn();
      await refetchAll();
      if (successKey) setFlash(t(successKey));
    } catch (err) {
      setError(formatApiError(err));
    }
  };
  const askConfirm = (summary: string, run: (reason?: string) => Promise<unknown>, opts?: { title?: string; confirmLabel?: string; icon?: import("solid-js").JSX.Element; prompt?: { label: string; placeholder?: string; maxLength?: number } }) =>
    setConfirm({ summary, run, ...opts });
  // withReason: the cancel path collects an optional reason; decline records none.
  const askCancel = (run: (reason?: string) => Promise<unknown>, withReason = true) =>
    askConfirm(t("appointments.confirmCancel"), run, {
      title: t("appointments.cancelTitle"),
      confirmLabel: t("appointments.cancelAction"),
      icon: <IconX class="h-4 w-4" />,
      prompt: withReason
        ? { label: t("appointments.cancelReasonLabel"), placeholder: t("appointments.cancelReasonPlaceholder"), maxLength: APPOINTMENT_LIMITS.reasonMaxLen }
        : undefined,
    });
  const askReject = (id: string) =>
    askConfirm(t("appointments.confirmReject"), (reason) => patchRejectAppointment(id, reason ? { reason } : undefined), {
      title: t("appointments.rejectTitle"),
      confirmLabel: t("appointments.rejectAction"),
      icon: <IconX class="h-4 w-4" />,
      prompt: { label: t("appointments.rejectReasonLabel"), placeholder: t("appointments.rejectReasonPlaceholder"), maxLength: APPOINTMENT_LIMITS.reasonMaxLen },
    });

  const timeOnly = (ms: number | null) =>
    ms == null ? "—" : new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-US", { timeStyle: "short" }).format(new Date(ms));
  const sameDay = (a: number | null, b: number | null) =>
    a != null && b != null && new Date(a).toDateString() === new Date(b).toDateString();
  // Same-day windows collapse the repeated date: "Jul 31, 2026, 3:07 – 7:30 PM".
  const timeWindow = (starts: number | null, ends: number | null) =>
    sameDay(starts, ends)
      ? `${formatDateTime(starts, locale())} – ${timeOnly(ends)}`
      : `${formatDateTime(starts, locale())} — ${formatDateTime(ends, locale())}`;
  // Stacked date/time cell: date on top, clock range below (tabular-nums so
  // digits line up across rows). Same-day windows show one date; cross-day
  // spells out the end date on the second line.
  const timeCell = (starts: number | null, ends: number | null) => (
    <div class="mono flex flex-col text-xs leading-tight tabular-nums">
      <span class="text-foreground">{formatDate(starts, locale())}</span>
      <span class="text-muted-foreground">
        {sameDay(starts, ends)
          ? `${timeOnly(starts)} – ${timeOnly(ends)}`
          : `${timeOnly(starts)} → ${formatDate(ends, locale())} ${timeOnly(ends)}`}
      </span>
    </div>
  );
  const statusBadge = (status: AppointmentStatus) => (
    <Badge variant="outline" class={cn("w-28 justify-center rounded-full", appointmentStatusClass(status))}>
      <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", appointmentStatusDotClass(status))} />
      {t(appointmentStatusLabelKey(status))}
    </Badge>
  );
  const detailAction = (a: Appointment) =>
    [{ label: t("appointments.details"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setDetailAppt(a) }];
  const recordActor = (a: Appointment) => (a.status === "rejected" ? a.decided_by : a.cancelled_by);
  const recordActorLabel = (a: Appointment) => (a.status === "rejected" ? t("appointments.rejectedBy") : t("appointments.cancelledBy"));
  const recordReason = (a: Appointment) => (a.status === "rejected" ? a.reject_reason : a.cancel_reason);
  const recordReasonLabel = (a: Appointment) => (a.status === "rejected" ? t("appointments.rejectReason") : t("appointments.cancelReason"));

  // --- staff: my published slots ---
  const mySlots = () => {
    const list = slots.latest ?? [];
    if (isManager()) return list;
    const uid = me()?.id;
    return list.filter((s) => s.teacher.id === uid);
  };
  const slotBooking = (slotId: string) => (appts.latest ?? []).find((a) => a.slot === slotId && isLive(a.status));

  const slotColumns = createMemo<ColumnDef<AppointmentSlot>[]>(() => [
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => timeCell(cell.row.original.starts_at, cell.row.original.ends_at),
    },
    {
      id: "status",
      header: t("appointments.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => {
        const booking = slotBooking(cell.row.original.id);
        return booking ? statusBadge(booking.status) : <span class="text-xs text-muted-foreground">{t("appointments.availableSlots")}</span>;
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "text-center", cellClass: "w-28 min-w-[7rem] text-center whitespace-nowrap" },
      cell: (cell) => {
        const slot = cell.row.original;
        const actions = [{
          label: t("appointments.details"),
          icon: <IconEye class="h-4 w-4" />,
          onSelect: () => setDetailSlot(slot),
        }, {
          label: t("appointments.deleteSlot"),
          icon: <IconTrash class="h-4 w-4" />,
          destructive: true,
          onSelect: () => askConfirm(t("appointments.confirmDeleteSlot"), () => deleteSlotById(slot.id)),
        }];
        if (slot.series) {
          // Distinct silhouette from the single-slot trash: a calendar-✕ signals
          // this removes the WHOLE recurring series, not just this one time — the
          // two menu items must not look identical.
          actions.push({
            label: t("appointments.deleteSeries"),
            icon: <IconCalendarX class="h-4 w-4" />,
            destructive: true,
            onSelect: () => askConfirm(t("appointments.confirmDeleteSeries"), () => deleteSlotSeries(slot.series!)),
          });
        }
        return <TableRowActions label={t("common.actions")} actions={actions} />;
      },
    },
  ]);

  // --- staff: booking requests for my slots ---
  const requests = () => {
    const list = appts.latest ?? [];
    if (isManager()) return list;
    const uid = me()?.id;
    return list.filter((a) => a.teacher?.id === uid);
  };

  const requestColumns = createMemo<ColumnDef<Appointment>[]>(() => [
    {
      id: "student",
      header: t("appointments.student"),
      cell: (cell) => <span class="block truncate font-medium">{personLabel(cell.row.original.requester)}</span>,
    },
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => (
        <div class="flex flex-col gap-0.5">
          {timeCell(cell.row.original.starts_at, cell.row.original.ends_at)}
          <Show when={hasStandingProposal(cell.row.original)}>
            <div class="text-info-text text-xs">{t("appointments.rescheduleProposed")}</div>
          </Show>
        </div>
      ),
    },
    {
      id: "status",
      header: t("appointments.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => statusBadge(cell.row.original.status),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "text-center", cellClass: "w-28 min-w-[7rem] text-center whitespace-nowrap" },
      cell: (cell) => {
        const a = cell.row.original;
        const actions = [] as { label: string; icon: import("solid-js").JSX.Element; destructive?: boolean; onSelect: () => void }[];
        for (const action of appointmentActions(a, "staff", now())) {
          if (action === "approve") actions.push({ label: t("appointments.approve"), icon: <IconCheck class="h-4 w-4" />, onSelect: () => void act(() => patchApproveAppointment(a.id), "appointments.status.approved") });
          if (action === "reject") actions.push({ label: t("appointments.reject"), icon: <IconX class="h-4 w-4" />, destructive: true, onSelect: () => askReject(a.id) });
          if (action === "reschedule") actions.push({ label: t("appointments.reschedule"), icon: <IconRefresh class="h-4 w-4" />, onSelect: () => setReschedAppt(a) });
        }
        // Staff never cancel — a booking is declined via reject (pending) or reschedule; only the requester cancels (their own bookings table).
        actions.push(...detailAction(a));
        return <Show when={actions.length > 0} fallback={<span class="text-muted-foreground">—</span>}><TableRowActions label={t("common.actions")} actions={actions} /></Show>;
      },
    },
  ]);

  // --- booker: available slots ---
  const myLiveSlotIds = () => new Set((appts.latest ?? []).filter((a) => a.requester.id === me()?.id && isLive(a.status)).map((a) => a.slot));
  const availableSlots = () => {
    const taken = myLiveSlotIds();
    // `book` refuses a slot whose window has OPENED ("the slot has already
    // started", no skew grace), not one that has ended — an in-progress slot
    // listed here would show a Book button that always 409s.
    return (slots.latest ?? []).filter((s) => s.starts_at > now() && !taken.has(s.id));
  };

  const availableColumns = createMemo<ColumnDef<AppointmentSlot>[]>(() => [
    {
      id: "teacher",
      header: t("appointments.teacher"),
      cell: (cell) => <span class="block truncate font-medium">{personLabel(cell.row.original.teacher)}</span>,
    },
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => timeCell(cell.row.original.starts_at, cell.row.original.ends_at),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-40 text-center", cellClass: "w-40 min-w-[10rem] text-center whitespace-nowrap" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("appointments.details"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setDetailSlot(cell.row.original) },
            { label: t("appointments.book"), icon: <IconPlus class="h-4 w-4" />, onSelect: () => setBookSlot(cell.row.original) },
          ]}
        />
      ),
    },
  ]);

  // --- booker: my bookings ---
  const myBookings = () => (appts.latest ?? []).filter((a) => a.requester.id === me()?.id);
  const nextBooking = createMemo(() =>
    myBookings()
      .filter((a) => isLive(a.status) && a.starts_at != null && a.starts_at > now())
      .sort((a, b) => a.starts_at! - b.starts_at!)[0] ?? null,
  );

  const bookingColumns = createMemo<ColumnDef<Appointment>[]>(() => [
    {
      id: "teacher",
      header: t("appointments.teacher"),
      cell: (cell) => <span class="block truncate font-medium">{personLabel(cell.row.original.teacher)}</span>,
    },
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => (
        <div class="flex flex-col gap-0.5">
          {/* The effective window IS the proposal while one stands (backend
              `Appointment::window`), so the row's own time already shows the
              proposed one — label it instead of printing it twice. */}
          <Show when={hasStandingProposal(cell.row.original)}>
            <div class="text-info-text text-xs">{t("appointments.proposedTime")}:</div>
          </Show>
          {timeCell(cell.row.original.starts_at, cell.row.original.ends_at)}
        </div>
      ),
    },
    {
      id: "status",
      header: t("appointments.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => statusBadge(cell.row.original.status),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "text-center", cellClass: "w-28 min-w-[7rem] text-center whitespace-nowrap" },
      cell: (cell) => {
        const a = cell.row.original;
        const actions = [] as { label: string; icon: import("solid-js").JSX.Element; destructive?: boolean; onSelect: () => void }[];
        for (const action of appointmentActions(a, "requester", now())) {
          if (action === "acceptReschedule" && a.proposed_starts_at != null && a.proposed_ends_at != null) actions.push({ label: t("appointments.acceptReschedule"), icon: <IconCheck class="h-4 w-4" />, onSelect: () => void act(() => patchAcceptReschedule(a.id, { proposed_starts_at: a.proposed_starts_at!, proposed_ends_at: a.proposed_ends_at! }), "appointments.status.approved") });
          if (action === "declineReschedule") actions.push({ label: t("appointments.declineReschedule"), icon: <IconX class="h-4 w-4" />, destructive: true, onSelect: () => askCancel(() => patchDeclineReschedule(a.id), false) });
          if (action === "cancel") actions.push({ label: t("appointments.cancel"), icon: <IconX class="h-4 w-4" />, destructive: true, onSelect: () => askCancel((reason) => patchCancelAppointment(a.id, reason ? { reason } : undefined)) });
        }
        actions.push(...detailAction(a));
        return <Show when={actions.length > 0} fallback={<span class="text-muted-foreground">—</span>}><TableRowActions label={t("common.actions")} actions={actions} /></Show>;
      },
    },
  ]);

  return (
    <div class="space-y-5">
      <SidePanel guardUnsaved open={showPublish()} onOpenChange={setShowPublish} title={t("appointments.publish")} description={t("appointments.publishSubtitle")}>
        <PublishSlotsForm
          onCancel={() => setShowPublish(false)}
          onSubmit={async (values) => {
            setError("");
            try {
              await postSlots(values);
              setShowPublish(false);
              await refetchAll();
              setFlash(t("common.created"));
            } catch (err) {
              setError(formatApiError(err));
              throw err;
            }
          }}
        />
      </SidePanel>

      <SidePanel guardUnsaved open={bookSlot() != null} onOpenChange={(o) => !o && setBookSlot(null)} title={t("appointments.book")} description={t("appointments.bookSubtitle")}>
        <Show when={bookSlot()}>
          {(slot) => (
            <BookAppointmentForm
              slot={slot()}
              onCancel={() => setBookSlot(null)}
              onSubmit={async (reason) => {
                setError("");
                try {
                  await postAppointment({ slot: slot().id, reason });
                  setBookSlot(null);
                  await refetchAll();
                  setSection("appointments");
                  setFlash(t("common.created"));
                } catch (err) {
                  setError(formatApiError(err));
                  throw err;
                }
              }}
            />
          )}
        </Show>
      </SidePanel>

      <SidePanel guardUnsaved open={reschedAppt() != null} onOpenChange={(o) => !o && setReschedAppt(null)} title={t("appointments.reschedule")} description={t("appointments.rescheduleSubtitle")}>
        <Show when={reschedAppt()}>
          {(appt) => (
            <RescheduleForm
              appointment={appt()}
              onCancel={() => setReschedAppt(null)}
              onSubmit={async (values) => {
                setError("");
                try {
                  await patchRescheduleAppointment(appt().id, values);
                  setReschedAppt(null);
                  await refetchAll();
                  setFlash(t("appointments.rescheduleProposed"));
                } catch (err) {
                  setError(formatApiError(err));
                  throw err;
                }
              }}
            />
          )}
        </Show>
      </SidePanel>

      <Show when={error() && !showPublish() && bookSlot() == null && reschedAppt() == null}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>


      <Tabs
        class="space-y-4"
        value={section()}
        onChange={(value) => setSection(value === "availability" ? "availability" : "appointments")}
      >
        <TabsList
          class="grid w-full grid-cols-2 sm:w-fit"
          aria-label={t("appointments.title")}
        >
          <TabsTrigger value="appointments" class="min-w-0">
            <IconCalendarDays class="h-4 w-4" />
            {isStaff() ? t("appointments.requests") : t("appointments.myBookings")}
            <Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">
              {isStaff() ? requests().length : myBookings().length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="availability" class="min-w-0">
            <IconClock class="h-4 w-4" />
            {isStaff() ? t("appointments.mySlots") : t("appointments.availableSlots")}
            <Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[11px] group-data-selected:bg-background group-data-selected:text-foreground">
              {isStaff() ? mySlots().length : availableSlots().length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" class="mt-0 space-y-4 border-0 bg-transparent p-0 shadow-none">
          <Show when={isStaff()} fallback={
            <section class="data-shell space-y-4 p-4">
              <Show when={loaded()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
                <Show when={appts.error}><Alert variant="destructive">{formatApiError(appts.error)}</Alert></Show>
                <Show when={nextBooking()}>
                  {(booking) => (
                    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-line bg-surface-tint p-4">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-base text-primary-text">
                        <IconCalendarDays class="h-4 w-4" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-text-strong">{personLabel(booking().teacher)}</p>
                        <p class="mono truncate text-xs text-text-subtle">{timeWindow(booking().starts_at, booking().ends_at)}</p>
                      </div>
                      {statusBadge(booking().status)}
                    </div>
                  )}
                </Show>
                <DataTable
                  title={t("appointments.myBookings")}
                  description={t("appointments.myBookingsHint")}
                  columns={bookingColumns()}
                  data={myBookings()}
                  tableClass="table-fixed min-w-[46rem]"
                  enablePagination
                  pageSize={PAGE_SIZE}
                  storageKey="appointment-bookings"
                  onRowClick={setDetailAppt}
                  empty={t("appointments.noBookings")}
                />
              </Show>
            </section>
          }>
            <section class="data-shell space-y-4 p-4">
              <Show when={loaded()} fallback={<DataTableSkeleton columns={5} rows={6} />}>
                <Show when={appts.error}><Alert variant="destructive">{formatApiError(appts.error)}</Alert></Show>
                <DataTable
                  title={t("appointments.requests")}
                  description={t("appointments.requestsHint")}
                  columns={requestColumns()}
                  data={requests()}
                  tableClass="table-fixed min-w-[46rem]"
                  enablePagination
                  pageSize={PAGE_SIZE}
                  storageKey="appointment-requests"
                  onRowClick={setDetailAppt}
                  empty={t("appointments.noRequests")}
                />
              </Show>
            </section>
          </Show>
        </TabsContent>

        <TabsContent value="availability" class="mt-0 border-0 bg-transparent p-0 shadow-none">
          <Show when={isStaff()} fallback={
            <section class="data-shell space-y-4 p-4">
              <Show when={loaded()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
                <Show when={slots.error}><Alert variant="destructive">{formatApiError(slots.error)}</Alert></Show>
                <DataTable
                  title={t("appointments.availableSlots")}
                  description={t("appointments.availableSlotsHint")}
                  columns={availableColumns()}
                  data={availableSlots()}
                  tableClass="table-fixed min-w-[46rem]"
                  enablePagination
                  pageSize={PAGE_SIZE}
                  storageKey="appointment-available-slots"
                  onRowClick={setDetailSlot}
                  empty={t("appointments.noSlots")}
                />
              </Show>
            </section>
          }>
            <section class="data-shell space-y-4 p-4">
              <Show when={loaded()} fallback={<DataTableSkeleton columns={5} rows={6} />}>
                <Show when={slots.error}><Alert variant="destructive">{formatApiError(slots.error)}</Alert></Show>
                <DataTable
                  title={t("appointments.mySlots")}
                  description={t("appointments.mySlotsHint")}
                  actions={
                    <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setShowPublish(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("appointments.publish")}
                    </Button>
                  }
                  columns={slotColumns()}
                  data={mySlots()}
                  tableClass="table-fixed min-w-[46rem]"
                  enablePagination
                  pageSize={PAGE_SIZE}
                  storageKey="appointment-my-slots"
                  onRowClick={setDetailSlot}
                  empty={t("appointments.noSlots")}
                />
              </Show>
            </section>
          </Show>
        </TabsContent>
      </Tabs>

      <SidePanel
        open={detailAppt() != null}
        onOpenChange={(open) => { if (!open) setDetailAppt(null); }}
        title={t("appointments.details")}
        description={detailAppt() ? timeWindow(detailAppt()!.starts_at, detailAppt()!.ends_at) : ""}
      >
        <Show when={detailAppt()} keyed>
          {(appointment) => (
            <div class="space-y-5">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label={t("appointments.student")} value={personLabel(appointment.requester)} />
                <DetailField label={t("appointments.teacher")} value={personLabel(appointment.teacher)} />
                <DetailField label={t("appointments.status")} value={t(appointmentStatusLabelKey(appointment.status))} />
                <DetailField label={t("appointments.time")} value={timeWindow(appointment.starts_at, appointment.ends_at)} />
                <DetailField label={t("appointments.proposedTime")} value={appointment.proposed_starts_at == null ? "—" : timeWindow(appointment.proposed_starts_at, appointment.proposed_ends_at)} />
                <DetailField label={t("appointments.series")} value={appointment.slot} mono />
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">{t("appointments.reason")}</p>
                <p class="rounded-lg border bg-card px-3 py-2.5 text-sm">{appointment.reason || "—"}</p>
              </div>
              <Show when={recordActor(appointment)}>
                <DetailField label={recordActorLabel(appointment)} value={personLabel(recordActor(appointment))} />
                <div class="space-y-1">
                  <p class="text-xs font-medium text-muted-foreground">{recordReasonLabel(appointment)}</p>
                  <p class="rounded-lg border bg-card px-3 py-2.5 text-sm">{recordReason(appointment) || "—"}</p>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </SidePanel>

      <SidePanel
        open={detailSlot() != null}
        onOpenChange={(open) => { if (!open) setDetailSlot(null); }}
        title={t("appointments.details")}
        description={detailSlot() ? timeWindow(detailSlot()!.starts_at, detailSlot()!.ends_at) : ""}
      >
        <Show when={detailSlot()} keyed>
          {(slot) => (
            <div class="space-y-5">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label={t("appointments.teacher")} value={personLabel(slot.teacher)} />
                <DetailField label={t("appointments.time")} value={timeWindow(slot.starts_at, slot.ends_at)} />
                <DetailField label={t("appointments.series")} value={slot.series || "—"} mono />
                <DetailField label={t("admin.id")} value={slot.id} mono />
              </div>
              <div class="space-y-1">
                <p class="text-xs font-medium text-muted-foreground">{t("appointments.note")}</p>
                <p class="rounded-lg border bg-card px-3 py-2.5 text-sm">{slot.note || "—"}</p>
              </div>
            </div>
          )}
        </Show>
      </SidePanel>

      <ConfirmDialog
        open={confirm() != null}
        onOpenChange={(o) => !o && setConfirm(null)}
        variant="destructive"
        title={confirm()?.title ?? t("confirm.deleteTitle")}
        confirmLabel={confirm()?.confirmLabel}
        icon={confirm()?.icon}
        prompt={confirm()?.prompt}
        summary={confirm()?.summary ?? ""}
        onConfirm={async (reason) => {
          const c = confirm();
          if (c) await act(() => c.run(reason));
        }}
      />
    </div>
  );
}
