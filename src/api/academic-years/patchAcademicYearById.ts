import { client } from "../client";
import type { AcademicYear, GradePromotion } from "../client";

export type PatchAcademicYearBody = {
  name?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  /** The whole new policy, not a delta: a grade left out is no longer promoted. */
  grade_promotions?: GradePromotion[] | null;
};

/** An archived year is read-only. */
export function patchAcademicYearById(id: string, body: PatchAcademicYearBody): Promise<AcademicYear> {
  return client<AcademicYear>(`/academic-years/${id}`, { method: "PATCH", body });
}
