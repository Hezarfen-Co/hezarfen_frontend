import { client } from "../client";
import type { CourseSession } from "../client";

export type PostInstanceSessionBody = {
  topic?: string | null;
  /** Defaults to the caller; must hold `teacher` or higher. */
  teacher_id?: string | null;
  starts_at: number;
  ends_at?: number | null;
};

export function postInstanceSession(instanceId: string, body: PostInstanceSessionBody): Promise<CourseSession> {
  return client<CourseSession>(`/instances/${instanceId}/sessions`, { method: "POST", body });
}
