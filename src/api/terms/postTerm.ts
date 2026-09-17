import { client } from "../client";
import type { Term } from "../client";

export type PostTermBody = {
  name: string;
  /** The academic year the dönem sits in; an archived year refuses it (409). */
  year: string;
  starts_at: number;
  ends_at: number;
};

export function postTerm(body: PostTermBody): Promise<Term> {
  return client<Term>("/terms", { method: "POST", body });
}
