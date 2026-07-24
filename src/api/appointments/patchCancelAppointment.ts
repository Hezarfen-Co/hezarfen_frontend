import { client } from "../client";
import type { Appointment } from "../client";

export type CancelAppointmentBody = {
  /** Optional free-text reason; blank/omitted records no reason. */
  reason?: string;
};

export function patchCancelAppointment(id: string, body?: CancelAppointmentBody): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/cancel`, { method: "PATCH", body });
}
