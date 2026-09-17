import { client } from "../client";
import type { ClassGroup } from "../client";

// Omit a field to keep it; send null on grade/year/teacher_id to clear/unlink it.
export type UpdateClassBody = {
  name?: string;
  grade?: string | null;
  /** The academic year (`getAcademicYears`) the şube sits in. */
  year?: string | null;
  teacher_id?: string | null;
};

export function patchClassById(id: string, body: UpdateClassBody): Promise<ClassGroup> {
  return client<ClassGroup>(`/classes/${id}`, { method: "PATCH", body });
}
