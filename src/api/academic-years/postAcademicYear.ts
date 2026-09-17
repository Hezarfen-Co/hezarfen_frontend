import { client } from "../client";
import type { AcademicYear, GradePromotion } from "../client";

export type PostAcademicYearBody = {
  name: string;
  /** May lie in the past — a school adopting the app mid-year backfills legitimately. */
  starts_at: number;
  ends_at: number;
  /** The sınıf-geçme policy; omit while the rollover is undecided. */
  grade_promotions?: GradePromotion[] | null;
};

export function postAcademicYear(body: PostAcademicYearBody): Promise<AcademicYear> {
  return client<AcademicYear>("/academic-years", { method: "POST", body });
}
