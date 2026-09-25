import { client } from "../client";
import type { Offering } from "../client";

/** Omit to keep; an explicit null clears the field back to inherit. */
export type UpdateOfferingBody = Partial<{
  title: string | null;
  description: string | null;
  default_ders_saati: number | null;
  default_counts_toward_karne: boolean | null;
}>;

// Manager+. Sections without their own override follow the change at once.
export function patchOfferingById(id: string, body: UpdateOfferingBody): Promise<Offering> {
  return client<Offering>(`/offerings/${id}`, { method: "PATCH", body });
}
