import { client } from "./client";
import type { WorkEntry } from "./types";

export type PatchWorkEntryBody = {
  check_in?: number | null;
  check_out?: number | null;
};

export function patchWorkEntryById(id: string, body: PatchWorkEntryBody): Promise<WorkEntry> {
  return client<WorkEntry>(`/work/entries/${id}`, { method: "PATCH", body });
}
