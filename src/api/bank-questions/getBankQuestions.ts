import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { BankQuestion, BankVisibility } from "../client";

/**
 * `owner` takes a user id or the literal "me". `visibility` only narrows what the
 * caller may already see — "private" is effectively their own drafts.
 */
export type BankQuestionFilters = PageParams & {
  subject?: string;
  owner?: string;
  q?: string;
  visibility?: BankVisibility;
};

export async function getBankQuestions(
  params?: BankQuestionFilters,
  signal?: AbortSignal,
): Promise<Page<BankQuestion>> {
  const query = new URLSearchParams();
  if (params?.subject) query.set("subject", params.subject);
  if (params?.owner) query.set("owner", params.owner);
  if (params?.q) query.set("q", params.q);
  if (params?.visibility) query.set("visibility", params.visibility);
  appendPageParams(query, params);
  const value = query.toString();
  const data = await client<unknown>(`/bank-questions${value ? `?${value}` : ""}`, { signal });
  return normalizePage<BankQuestion>(data);
}
