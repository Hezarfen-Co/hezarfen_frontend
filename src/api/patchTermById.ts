import { client } from "./client";
import type { Term } from "./types";

export type PatchTermBody = {
  name?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function patchTermById(id: string, body: PatchTermBody): Promise<Term> {
  return client<Term>(`/terms/${id}`, { method: "PATCH", body });
}
