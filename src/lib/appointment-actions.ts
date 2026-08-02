/**
 * Which appointment actions the backend will actually accept, per viewer.
 *
 * Mirrors the guards in `hezarfen_backend/src/web/appointments.rs` and
 * `src/domain/appointment.rs`. This app serves children: an action must never
 * be offered when the server is going to answer 403/409.
 */
import type { Appointment } from "@/api/client";

export type AppointmentAction =
  // staff = the slot's teacher, or any manager+ (`can_manage`)
  | "approve"
  | "reject"
  | "reschedule"
  // requester = the person who asked for the meeting (`ensure_requester`)
  | "cancel"
  | "acceptReschedule"
  | "declineReschedule";

export type AppointmentViewer = "staff" | "requester";

/**
 * A counter-proposal still waiting for the requester's answer.
 *
 * The backend NEVER clears `proposed_*` — `accept_proposal` delegates to
 * `approve`, which writes `status`/`decided_by` only. So `proposed_* != null`
 * on a settled or approved row is an *answered* proposal, not a standing one,
 * and gating on it would strand the teacher without a reschedule action forever.
 */
export function hasStandingProposal(a: Appointment): boolean {
  return a.status === "pending" && a.proposed_starts_at != null && a.proposed_ends_at != null;
}

const isLive = (a: Appointment) => a.status === "pending" || a.status === "approved";

/**
 * Has the *effective* window opened? `starts_at` is already the effective one
 * (`Appointment::window` prefers a proposal whenever the row carries one), which
 * is exactly the value every `<= now` 409 guard compares. `null` means the slot
 * is gone, so every action would 404 — treat it as closed.
 */
const hasStarted = (a: Appointment, now: number) => a.starts_at == null || a.starts_at <= now;

export function appointmentActions(a: Appointment, viewer: AppointmentViewer, now: number): AppointmentAction[] {
  const standing = hasStandingProposal(a);
  const actions: AppointmentAction[] = [];
  if (viewer === "staff") {
    // `approve` needs pending + a window that has not opened. While the
    // teacher's own counter-proposal stands the backend would still take it,
    // but accepting it is the requester's call — we do not offer a way to move
    // someone else's meeting without their answer.
    if (a.status === "pending" && !standing && !hasStarted(a, now)) actions.push("approve");
    // `reject` is guarded by `read_pending` alone — no time check — so a passed
    // pending request (or a standing proposal the teacher wants back) can
    // always be turned down.
    if (a.status === "pending") actions.push("reject");
    // `propose` needs a live row only; the *new* time must be in the future,
    // which the reschedule form validates. Re-proposing over an answered or a
    // standing proposal is legal.
    if (isLive(a)) actions.push("reschedule");
    return actions;
  }
  // Requester side. Accepting is `approve` at the proposed time and declining
  // is `cancel`, so both close once that window opens.
  if (standing) {
    if (!hasStarted(a, now)) actions.push("acceptReschedule", "declineReschedule");
    return actions;
  }
  if (isLive(a) && !hasStarted(a, now)) actions.push("cancel");
  return actions;
}
