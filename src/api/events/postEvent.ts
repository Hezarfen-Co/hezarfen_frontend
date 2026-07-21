import { client } from "../client";
import type { Event, EventAudience } from "../client";

export type PostEventBody = {
  title: string;
  description?: string | null;
  audience?: EventAudience | null;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function postEvent(body: PostEventBody): Promise<Event> {
  return client<Event>("/events", { method: "POST", body });
}
