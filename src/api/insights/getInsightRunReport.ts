import { blobClient } from "../client";
import { insightRunReportPath } from "./insightRunReportUrl";

/**
 * The stored document's bytes. Read back after a generation that answered
 * `200`: a day whose report was never written — or was lost since — answers
 * `409 report_missing`, which must not be handed over as a download.
 * Manager+ only, like the generation that wrote it.
 */
export function getInsightRunReport(runDay: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(insightRunReportPath(runDay), signal);
}
