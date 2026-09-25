import { client } from "../client";
import type { ClassGroup } from "../client";

// Omit a field to keep it; send null on year/teacher_id to clear/unlink it. The
// grade is required on every class, so `grade_level` can be reset, never cleared.
export type UpdateClassBody = {
  name?: string;
  grade_level?: number;
  /** The academic year (`getAcademicYears`) the şube sits in. */
  year?: string | null;
  teacher_id?: string | null;
};

export function patchClassById(id: string, body: UpdateClassBody): Promise<ClassGroup> {
  return client<ClassGroup>(`/classes/${id}`, { method: "PATCH", body });
}
