import { client } from "../client";
import type { Appointment } from "../client";

export type RejectAppointmentBody = {
  /** Optional free-text reason; blank/omitted records no reason. */
  reason?: string;
};

export function patchRejectAppointment(id: string, body?: RejectAppointmentBody): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/reject`, { method: "PATCH", body });
}
