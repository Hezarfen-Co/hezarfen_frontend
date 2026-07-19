import { client } from "./client";
import type { WorkEntry } from "./types";

/** Omitted fields keep their value; null never clears here. */
export type PatchWorkEntryBody = {
  check_in?: number;
  check_out?: number;
};

export function patchWorkEntryById(id: string, body: PatchWorkEntryBody): Promise<WorkEntry> {
  return client<WorkEntry>(`/work/entries/${id}`, { method: "PATCH", body });
}
