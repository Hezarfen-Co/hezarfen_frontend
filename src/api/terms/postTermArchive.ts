import { client } from "../client";
import type { Term } from "../client";

export function postTermArchive(id: string): Promise<Term> {
  return client<Term>(`/terms/${id}/archive`, { method: "POST" });
}
