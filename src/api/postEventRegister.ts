import { client } from "./client";
import type { EventRegistration } from "./types";

export type PostEventRegisterBody = {
  user_id?: string | null;
};

export function postEventRegister(eventId: string, body: PostEventRegisterBody): Promise<EventRegistration> {
  return client<EventRegistration>(`/events/${eventId}/register`, {
    method: "POST",
    body,
  });
}
