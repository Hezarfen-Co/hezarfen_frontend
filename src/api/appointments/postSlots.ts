import { client } from "../client";
import type { AppointmentSlot } from "../client";

export type PublishSlotsBody = {
  starts_at: number;
  ends_at: number;
  note?: string | null;
  repeat_weekly?: boolean;
  until?: number | null;
};

export function postSlots(body: PublishSlotsBody): Promise<AppointmentSlot[]> {
  return client<AppointmentSlot[]>("/appointments/slots", { method: "POST", body });
}
