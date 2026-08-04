import { client } from "../client";

// Detaches every course this blueprint attached, across every class at the
// grade, then drops the template. Hand-attached courses stay.
export function deleteClassBlueprintByGrade(grade: string): Promise<void> {
  return client<void>(`/classes/blueprints/${encodeURIComponent(grade)}`, { method: "DELETE" });
}
