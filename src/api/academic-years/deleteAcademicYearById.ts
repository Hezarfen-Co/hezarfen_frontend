import { client } from "../client";

/** 409 while any şube or dönem still links it. An archived year cannot be deleted. */
export function deleteAcademicYearById(id: string): Promise<void> {
  return client<void>(`/academic-years/${id}`, { method: "DELETE" });
}
