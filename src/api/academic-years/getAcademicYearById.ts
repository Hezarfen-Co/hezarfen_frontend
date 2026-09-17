import { client } from "../client";
import type { AcademicYear } from "../client";

export function getAcademicYearById(id: string, signal?: AbortSignal): Promise<AcademicYear> {
  return client<AcademicYear>(`/academic-years/${id}`, { signal });
}
