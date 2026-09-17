import { client } from "../client";
import type { ClassGroup } from "../client";

// `year` is the academic year (`getAcademicYears`) — what binds the şube to a
// karne and to the rollover. A şube with no year takes no exam.
export type CreateClassBody = { name: string; grade?: string; year?: string; teacher_id?: string };

export function postClass(body: CreateClassBody): Promise<ClassGroup> {
  return client<ClassGroup>("/classes", { method: "POST", body });
}
