import type { Appointment, AppointmentStatus } from "@/api/client";
import { appointmentActions, hasStandingProposal } from "./appointment-actions";

const NOW = 1_800_000_000_000;
const FUTURE = NOW + 60 * 60 * 1000;
const PAST = NOW - 60 * 60 * 1000;

const appt = (status: AppointmentStatus, opts: { proposed?: boolean; startsAt?: number | null } = {}): Appointment =>
  ({
    id: "a1",
    slot: "s1",
    teacher: null,
    requester: { id: "u1", username: "ali", display_name: null },
    status,
    reason: "ödev",
    starts_at: opts.startsAt === undefined ? FUTURE : opts.startsAt,
    ends_at: FUTURE + 1000,
    proposed_starts_at: opts.proposed ? FUTURE : null,
    proposed_ends_at: opts.proposed ? FUTURE + 1000 : null,
    proposed_by: null,
    decided_by: null,
    cancelled_by: null,
    cancel_reason: null,
    reject_reason: null,
    created_at: PAST,
  }) as Appointment;

it("counts a proposal as standing only while the row is still pending", () => {
  expect(hasStandingProposal(appt("pending", { proposed: true }))).toBe(true);
  // The backend never clears proposed_* on accept — an approved row with a
  // proposal is an ANSWERED one, so the teacher keeps their reschedule action.
  expect(hasStandingProposal(appt("approved", { proposed: true }))).toBe(false);
  expect(hasStandingProposal(appt("cancelled", { proposed: true }))).toBe(false);
});

it("offers staff exactly what the backend accepts", () => {
  expect(appointmentActions(appt("pending"), "staff", NOW)).toEqual(["approve", "reject", "reschedule"]);
  // Standing proposal: no self-approval of one's own counter-proposal, but the
  // teacher can still withdraw it (reject) or propose again.
  expect(appointmentActions(appt("pending", { proposed: true }), "staff", NOW)).toEqual(["reject", "reschedule"]);
  // Answered proposal: reschedule must come back (the old `proposed_* != null`
  // gate lost it forever after one accepted reschedule).
  expect(appointmentActions(appt("approved", { proposed: true }), "staff", NOW)).toEqual(["reschedule"]);
  expect(appointmentActions(appt("approved"), "staff", NOW)).toEqual(["reschedule"]);
  // Window opened: approve 409s ("that time has already started"), reject does not.
  expect(appointmentActions(appt("pending", { startsAt: PAST }), "staff", NOW)).toEqual(["reject", "reschedule"]);
  expect(appointmentActions(appt("rejected"), "staff", NOW)).toEqual([]);
  expect(appointmentActions(appt("cancelled"), "staff", NOW)).toEqual([]);
});

it("offers the requester exactly what the backend accepts", () => {
  expect(appointmentActions(appt("pending"), "requester", NOW)).toEqual(["cancel"]);
  expect(appointmentActions(appt("approved"), "requester", NOW)).toEqual(["cancel"]);
  expect(appointmentActions(appt("pending", { proposed: true }), "requester", NOW)).toEqual([
    "acceptReschedule",
    "declineReschedule",
  ]);
  // Started windows: cancel/accept/decline all 409.
  expect(appointmentActions(appt("approved", { startsAt: PAST }), "requester", NOW)).toEqual([]);
  expect(appointmentActions(appt("pending", { proposed: true, startsAt: PAST }), "requester", NOW)).toEqual([]);
  // Slot vanished -> every call 404s.
  expect(appointmentActions(appt("pending", { startsAt: null }), "requester", NOW)).toEqual([]);
  expect(appointmentActions(appt("cancelled"), "requester", NOW)).toEqual([]);
  expect(appointmentActions(appt("rejected"), "requester", NOW)).toEqual([]);
});
