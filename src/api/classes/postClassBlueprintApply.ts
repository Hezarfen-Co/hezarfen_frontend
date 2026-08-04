import { client } from "../client";
import type { BlueprintApplyResult } from "../client";

// Applies this class's grade blueprint to this one class. A 404 means either
// the class is gone or no blueprint covers its grade.
export function postClassBlueprintApply(classId: string): Promise<BlueprintApplyResult> {
  return client<BlueprintApplyResult>(`/classes/${encodeURIComponent(classId)}/blueprint`, {
    method: "POST",
  });
}
