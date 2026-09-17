import { client } from "../client";
import type { AcademicYear } from "../client";

/**
 * Freezes the year as past structure: no new şube, dönem or exam inside it,
 * and no edit or delete. Idempotent, and there is no unarchive route.
 */
export function postAcademicYearArchive(id: string): Promise<AcademicYear> {
  return client<AcademicYear>(`/academic-years/${id}/archive`, { method: "POST" });
}
