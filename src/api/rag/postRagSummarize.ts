import { client } from "../client";
import type { RagStudyScope, RagSummary } from "../client";

/** Summarize one range of one corpus the caller may study. */
export function postRagSummarize(scope: RagStudyScope): Promise<RagSummary> {
  return client<RagSummary>("/rag/summarize", { method: "POST", body: scope });
}
