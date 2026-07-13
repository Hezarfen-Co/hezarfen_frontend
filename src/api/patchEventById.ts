import { client } from "./client";
import type { Event } from "./types";

/** Omitted time fields keep their value; explicit null clears them. */
export type PatchEventBody = {
  title?: string | null;
  description?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function patchEventById(id: string, body: PatchEventBody): Promise<Event> {
  return client<Event>(`/events/${id}`, { method: "PATCH", body });
}
