import { client } from "../client";
import type { BlueprintResult } from "../client";

export type CreateBlueprintBody = { grade_level: number; course_ids: string[] };

// Manager+. Creates the blueprint and immediately applies it to every existing
// class at that grade; pairs that could not land come back in `skipped`.
// A grade that already holds a blueprint is a 409.
export function postClassBlueprint(body: CreateBlueprintBody): Promise<BlueprintResult> {
  return client<BlueprintResult>("/classes/blueprints", { method: "POST", body });
}
