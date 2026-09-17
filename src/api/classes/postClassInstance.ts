import { client } from "../client";
import type { ClassCourse } from "../client";

export type AttachCourseBody = { course_id: string };

/**
 * Attaching a catalog course to a şube is what **mints the instance** — the
 * class×course row every exam, session and roster keys on. The class's whole
 * roster is enrolled in one go; students already enrolled by hand keep their
 * own rows. Needs teacher+ and catalog rights on the course; 409 on a repeat.
 */
export function postClassInstance(classId: string, body: AttachCourseBody): Promise<ClassCourse> {
  return client<ClassCourse>(`/classes/${classId}/instances`, { method: "POST", body });
}
