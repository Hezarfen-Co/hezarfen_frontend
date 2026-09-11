import { client } from "../client";
import type { Term } from "../client";

export function postTermUnarchive(id: string): Promise<Term> {
  return client<Term>(`/terms/${id}/unarchive`, { method: "POST" });
}
