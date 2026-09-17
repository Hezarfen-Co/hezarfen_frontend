import { client } from "../client";
import type { Homework } from "../client";

export type PostInstanceHomeworkBody = {
  title: string;
  description?: string | null;
  /** One of the catalog course's subjects — required. */
  subject_id: string;
  /** Required and must be in the future. */
  due_at: number;
  /** Omit, null or [] assigns the whole enrolled roster; a subset caps at 200. */
  assigned?: string[] | null;
};

export function postInstanceHomework(instanceId: string, body: PostInstanceHomeworkBody): Promise<Homework> {
  return client<Homework>(`/instances/${instanceId}/homework`, { method: "POST", body });
}
