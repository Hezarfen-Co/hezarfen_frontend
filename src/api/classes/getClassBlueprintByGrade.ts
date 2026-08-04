import { client } from "../client";
import type { ClassBlueprint } from "../client";

// The grade label is the record key and is free text, so it must be encoded —
// a grade like "9/A" would otherwise read as a second path segment.
export function getClassBlueprintByGrade(grade: string, signal?: AbortSignal): Promise<ClassBlueprint> {
  return client<ClassBlueprint>(`/classes/blueprints/${encodeURIComponent(grade)}`, { signal });
}
