import { client } from "../client";
import type { MarksReport } from "../client";

export function getMyMarks(signal?: AbortSignal): Promise<MarksReport> {
  return client<MarksReport>("/marks/me", { signal });
}
