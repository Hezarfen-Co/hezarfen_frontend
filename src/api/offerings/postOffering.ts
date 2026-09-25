import { client } from "../client";
import type { Offering } from "../client";

export type CreateOfferingBody = {
  course: string;
  grade_level: number;
  title?: string | null;
  description?: string | null;
  default_ders_saati?: number | null;
  default_counts_toward_karne?: boolean | null;
};

// Manager+. Only a `course`-kind ders has a grade axis; a second template for
// the same (course, grade) is a 409 `offering_exists`.
export function postOffering(body: CreateOfferingBody): Promise<Offering> {
  return client<Offering>("/offerings", { method: "POST", body });
}
