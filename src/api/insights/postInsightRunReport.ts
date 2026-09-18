import { client } from "../client";
import { insightRunReportPath } from "./insightRunReportUrl";

/**
 * The receipt for the school report the service just wrote: the day it covers,
 * its size in bytes, whether the service had to truncate it, the service's own
 * notes, and when it was stored (ms epoch, the same clock as the run ledger).
 */
export type GeneratedInsightRunReport = {
  run_day: string;
  byte_size: number;
  truncated: boolean;
  notes: string[];
  generated_at: number;
};

/**
 * Generate the school-level report document for one run day. Manager+ only,
 * and synchronous: the service writes it before this answers. `503` when no AI
 * service offers the report right now; `409` (`report_refused`) when the
 * service refused — nothing is stored then, so `getInsightRunReport` would
 * find nothing.
 */
export function postInsightRunReport(runDay: string): Promise<GeneratedInsightRunReport> {
  return client<GeneratedInsightRunReport>(insightRunReportPath(runDay), { method: "POST" });
}
