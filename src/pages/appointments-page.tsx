import { Show, createMemo, createResource, createSignal } from "solid-js";
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
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconCalendarX, IconCheck, IconEye, IconPlus, IconRefresh, IconTrash, IconX } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
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
  const [bookSlot, setBookSlot] = createSignal<AppointmentSlot | null>(null);
  const [reschedAppt, setReschedAppt] = createSignal<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = createSignal<Appointment | null>(null);
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
  // Cancelled/rejected appointments carry a record (who + optional reason) shown in the details dialog.
  const hasRecord = (a: Appointment) => a.status === "cancelled" || a.status === "rejected";
  const detailAction = (a: Appointment) =>
    hasRecord(a)
      ? [{ label: t("appointments.details"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setDetailAppt(a) }]
      : [];
  // The details dialog surfaces cancelled-by/cancel-reason or (for rejected) decided-by/reject-reason.
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
      id: "note",
      header: t("appointments.note"),
      cell: (cell) => <span class="truncate">{cell.row.original.note || "—"}</span>,
    },
    {
      id: "series",
      header: t("appointments.series"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => (cell.row.original.series ? <Badge variant="outline" class="rounded-full"><IconRefresh class="mr-1 h-3 w-3" />{t("appointments.repeatWeekly")}</Badge> : <span class="text-muted-foreground">—</span>),
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
      cell: (cell) => <span class="font-medium">{personLabel(cell.row.original.requester)}</span>,
    },
    {
      id: "reason",
      header: t("appointments.reason"),
      cell: (cell) => <span class="truncate text-sm text-muted-foreground">{cell.row.original.reason || "—"}</span>,
    },
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => (
        <div class="flex flex-col gap-0.5">
          {timeCell(cell.row.original.starts_at, cell.row.original.ends_at)}
          <Show when={hasStandingProposal(cell.row.original)}>
            <div class="text-info text-xs">{t("appointments.rescheduleProposed")}</div>
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
      cell: (cell) => <span class="font-medium">{personLabel(cell.row.original.teacher)}</span>,
    },
    {
      id: "time",
      header: t("appointments.time"),
      meta: { headerClass: "w-44", cellClass: "align-top pr-4" },
      cell: (cell) => timeCell(cell.row.original.starts_at, cell.row.original.ends_at),
    },
    {
      id: "note",
      header: t("appointments.note"),
      cell: (cell) => <span class="truncate text-sm text-muted-foreground">{cell.row.original.note || "—"}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-40 text-center", cellClass: "w-40 min-w-[10rem] text-center whitespace-nowrap" },
      cell: (cell) => (
        <Button type="button" size="sm" variant="outline" class="rounded-lg" onClick={() => setBookSlot(cell.row.original)}>
          <IconPlus class="h-4 w-4" />
          {t("appointments.book")}
        </Button>
      ),
    },
  ]);

  // --- booker: my bookings ---
  const myBookings = () => (appts.latest ?? []).filter((a) => a.requester.id === me()?.id);

  const bookingColumns = createMemo<ColumnDef<Appointment>[]>(() => [
    {
      id: "teacher",
      header: t("appointments.teacher"),
      cell: (cell) => <span class="font-medium">{personLabel(cell.row.original.teacher)}</span>,
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
            <div class="text-info text-xs">{t("appointments.proposedTime")}:</div>
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
          if (action === "acceptReschedule") actions.push({ label: t("appointments.acceptReschedule"), icon: <IconCheck class="h-4 w-4" />, onSelect: () => void act(() => patchAcceptReschedule(a.id), "appointments.status.approved") });
          if (action === "declineReschedule") actions.push({ label: t("appointments.declineReschedule"), icon: <IconX class="h-4 w-4" />, destructive: true, onSelect: () => askCancel(() => patchDeclineReschedule(a.id), false) });
          if (action === "cancel") actions.push({ label: t("appointments.cancel"), icon: <IconX class="h-4 w-4" />, destructive: true, onSelect: () => askCancel((reason) => patchCancelAppointment(a.id, reason ? { reason } : undefined)) });
        }
        actions.push(...detailAction(a));
        return <Show when={actions.length > 0} fallback={<span class="text-muted-foreground">—</span>}><TableRowActions label={t("common.actions")} actions={actions} /></Show>;
      },
    },
  ]);

  return (
    <div class="space-y-6">
      <SidePanel open={showPublish()} onOpenChange={setShowPublish} title={t("appointments.publish")} description={t("appointments.publishSubtitle")}>
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

      <SidePanel open={bookSlot() != null} onOpenChange={(o) => !o && setBookSlot(null)} title={t("appointments.book")} description={t("appointments.bookSubtitle")}>
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

      <SidePanel open={reschedAppt() != null} onOpenChange={(o) => !o && setReschedAppt(null)} title={t("appointments.reschedule")} description={t("appointments.rescheduleSubtitle")}>
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

      <Show when={isStaff()} fallback={
        <>
          <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
            <Show when={loaded()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
              <Show when={slots.error}><Alert variant="destructive">{formatApiError(slots.error)}</Alert></Show>
              <DataTable
                title={t("appointments.availableSlots")}
                description={t("appointments.subtitle")}
                columns={availableColumns()}
                data={availableSlots()}
                tableClass="table-fixed min-w-[46rem]"
                enablePagination
                pageSize={PAGE_SIZE}
                empty={t("appointments.noSlots")}
              />
            </Show>
          </section>
          <section class="data-shell space-y-4 border-violet-500/15 bg-violet-500/2.5 p-4">
            <Show when={loaded()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
              <Show when={appts.error}><Alert variant="destructive">{formatApiError(appts.error)}</Alert></Show>
              <DataTable
                title={t("appointments.myBookings")}
                columns={bookingColumns()}
                data={myBookings()}
                tableClass="table-fixed min-w-[46rem]"
                enablePagination
                pageSize={PAGE_SIZE}
                empty={t("appointments.noBookings")}
              />
            </Show>
          </section>
        </>
      }>
        <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
          <Show when={loaded()} fallback={<DataTableSkeleton columns={5} rows={6} />}>
            <Show when={slots.error}><Alert variant="destructive">{formatApiError(slots.error)}</Alert></Show>
            <DataTable
              title={t("appointments.mySlots")}
              description={t("appointments.subtitle")}
              actions={
                <Button type="button" size="sm" class="min-w-30" onClick={() => setShowPublish(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("appointments.publish")}
                </Button>
              }
              columns={slotColumns()}
              data={mySlots()}
              tableClass="table-fixed min-w-[46rem]"
              enablePagination
              pageSize={PAGE_SIZE}
              empty={t("appointments.noSlots")}
            />
          </Show>
        </section>
        <section class="data-shell space-y-4 border-violet-500/15 bg-violet-500/2.5 p-4">
          <Show when={loaded()} fallback={<DataTableSkeleton columns={5} rows={6} />}>
            <Show when={appts.error}><Alert variant="destructive">{formatApiError(appts.error)}</Alert></Show>
            <DataTable
              title={t("appointments.requests")}
              columns={requestColumns()}
              data={requests()}
              tableClass="table-fixed min-w-[46rem]"
              enablePagination
              pageSize={PAGE_SIZE}
              empty={t("appointments.noRequests")}
            />
          </Show>
        </section>
      </Show>

      <Dialog open={detailAppt() != null} onOpenChange={(o) => !o && setDetailAppt(null)}>
        <DialogContent class="max-w-md" dismissable>
          <DialogHeader>
            <DialogTitle>{t("appointments.details")}</DialogTitle>
          </DialogHeader>
          <Show when={detailAppt()}>
            {(a) => (
              <DialogBody class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t("appointments.status")}</span>
                  {statusBadge(a().status)}
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-foreground">{t("appointments.time")}</span>
                  <span class="mono text-xs">{timeWindow(a().starts_at, a().ends_at)}</span>
                </div>
                <Show when={recordActor(a())}>
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-muted-foreground">{recordActorLabel(a())}</span>
                    <span class="font-medium">{personLabel(recordActor(a()))}</span>
                  </div>
                </Show>
                <div class="space-y-1">
                  <p class="text-muted-foreground">{recordReasonLabel(a())}</p>
                  <p class="rounded-md border border-border bg-muted/40 px-3 py-2 leading-relaxed">{recordReason(a()) || "—"}</p>
                </div>
              </DialogBody>
            )}
          </Show>
        </DialogContent>
      </Dialog>

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
