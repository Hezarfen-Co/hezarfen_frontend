import { client } from "../client";
import type { MaterializeReport } from "../client";

/** `from`/`to` are UTC unix-millis naming school days; `apply: false` is a dry run. */
export type MaterializeBody = { from: number; to: number; apply?: boolean };

// Expands the resolved week into dated lessons. Additive and idempotent:
// holiday days and already-scheduled starts are skipped and counted.
export function postInstanceWeeklyPlanMaterialize(id: string, body: MaterializeBody): Promise<MaterializeReport> {
  return client<MaterializeReport>(`/instances/${id}/weekly-plan/materialize`, { method: "POST", body });
}
