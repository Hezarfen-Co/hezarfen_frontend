import { client } from "../client";
import type { Appointment } from "../client";

export function patchAcceptReschedule(id: string): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/reschedule/accept`, { method: "PATCH" });
}
