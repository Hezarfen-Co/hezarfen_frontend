import { client } from "./client";
import type { Event } from "./types";

export type PostEventBody = {
  title: string;
  description?: string;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function postEvent(body: PostEventBody): Promise<Event> {
  return client<Event>("/events", { method: "POST", body });
}
