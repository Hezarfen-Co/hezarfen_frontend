import { client } from "../client";
import type { Appointment } from "../client";

export function patchDeclineReschedule(id: string): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/reschedule/decline`, { method: "PATCH" });
}
