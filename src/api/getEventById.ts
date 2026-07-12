import { client } from "./client";
import type { Event } from "./types";

export function getEventById(id: string, signal?: AbortSignal): Promise<Event> {
  return client<Event>(`/events/${id}`, { signal });
}
