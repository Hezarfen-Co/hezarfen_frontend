import { client } from "../client";
import type { Appointment } from "../client";

export type RescheduleBody = {
  starts_at: number;
  ends_at: number;
};

export function patchRescheduleAppointment(id: string, body: RescheduleBody): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/reschedule`, { method: "PATCH", body });
}
