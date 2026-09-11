import { client } from "../client";
import type { BlueprintStatus } from "../client";

export function getClassBlueprintStatus(grade: string, signal?: AbortSignal): Promise<BlueprintStatus> {
  return client<BlueprintStatus>(`/classes/blueprints/${encodeURIComponent(grade)}/status`, { signal });
}
