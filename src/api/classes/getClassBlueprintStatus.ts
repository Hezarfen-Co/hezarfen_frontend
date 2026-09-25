import { client } from "../client";
import type { BlueprintStatus } from "../client";

export function getClassBlueprintStatus(gradeLevel: number, signal?: AbortSignal): Promise<BlueprintStatus> {
  return client<BlueprintStatus>(`/classes/blueprints/${gradeLevel}/status`, { signal });
}
