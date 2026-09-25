import { client } from "../client";
import type { CreateClassResponse } from "../client";

// `year` is the academic year (`getAcademicYears`) — what binds the şube to a
// karne and to the rollover. A şube with no year takes no exam.
// `grade_level` is the rung on the grade ladder, 0 (anaokulu) .. 12; required.
export type CreateClassBody = { name: string; grade_level: number; year?: string; teacher_id?: string };

// The 201 is a create envelope, not the bare class: its `class` is what the
// route navigates to, and its `skipped` is the blueprint fallout the caller
// has to report.
export function postClass(body: CreateClassBody): Promise<CreateClassResponse> {
  return client<CreateClassResponse>("/classes", { method: "POST", body });
}
