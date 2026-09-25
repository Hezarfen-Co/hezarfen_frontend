import { client } from "../client";
import type { Instance } from "../client";

/**
 * The section's own overrides. Omit to keep; a PATCH sets, it never clears —
 * clearing back to inherit is postInstanceReset. Never send null.
 */
export type PatchInstanceBody = {
  title?: string;
  description?: string;
  ders_saati?: number;
  counts_toward_karne?: boolean;
};

export function patchInstanceById(id: string, body: PatchInstanceBody): Promise<Instance> {
  return client<Instance>(`/instances/${id}`, { method: "PATCH", body });
}
