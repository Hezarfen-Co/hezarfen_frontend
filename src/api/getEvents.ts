import { client } from "./client";
import type { Event } from "./types";

export function getEvents(signal?: AbortSignal): Promise<Event[]> {
  return client<Event[]>("/events", { signal });
}
