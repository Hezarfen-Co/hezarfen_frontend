import { client } from "../client";
import type { Appointment } from "../client";

export function patchApproveAppointment(id: string): Promise<Appointment> {
  return client<Appointment>(`/appointments/${id}/approve`, { method: "PATCH" });
}
