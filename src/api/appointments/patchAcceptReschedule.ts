import { client } from "../client";
import type { Appointment } from "../client";

// The backend pins which proposal is being accepted: the caller echoes the
// proposed window it read, and a superseded proposal returns 409.
export type AcceptRescheduleBody = { proposed_starts_at: number; proposed_ends_at: number };

export function patchAcceptReschedule(id: string, body: AcceptRescheduleBody): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/reschedule/accept`, { method: "PATCH", body });
}
