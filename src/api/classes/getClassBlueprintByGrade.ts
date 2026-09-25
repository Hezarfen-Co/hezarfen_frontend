import { client } from "../client";
import type { ClassBlueprint } from "../client";

// The grade level (0..12) is the record key.
export function getClassBlueprintByGrade(gradeLevel: number, signal?: AbortSignal): Promise<ClassBlueprint> {
  return client<ClassBlueprint>(`/classes/blueprints/${gradeLevel}`, { signal });
}
