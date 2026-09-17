import { client } from "../client";
import type { Instance } from "../client";

/** Both fields are non-clearable: omit to keep, never send null. */
export type PatchInstanceBody = {
  ders_saati?: number;
  counts_toward_karne?: boolean;
};

export function patchInstanceById(id: string, body: PatchInstanceBody): Promise<Instance> {
  return client<Instance>(`/instances/${id}`, { method: "PATCH", body });
}
