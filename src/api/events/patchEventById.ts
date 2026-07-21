import { client } from "../client";
import type { Event, EventAudience } from "../client";

/** Omitted fields keep their value. Only the time fields clear on explicit null. */
export type PatchEventBody = {
  title?: string;
  description?: string;
  audience?: EventAudience;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function patchEventById(id: string, body: PatchEventBody): Promise<Event> {
  return client<Event>(`/events/${id}`, { method: "PATCH", body });
}
