import { client } from "../client";
import type { Appointment } from "../client";

export type BookAppointmentBody = {
  slot: string;
  reason: string;
};

export function postAppointment(body: BookAppointmentBody): Promise<Appointment> {
  return client<Appointment>("/appointments", { method: "POST", body });
}
