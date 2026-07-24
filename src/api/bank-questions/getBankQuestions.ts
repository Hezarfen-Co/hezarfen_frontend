import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { BankQuestion } from "../client";

/** `owner` takes a user id or the literal "me". */
export type BankQuestionFilters = PageParams & { subject?: string; owner?: string };

export async function getBankQuestions(
  params?: BankQuestionFilters,
  signal?: AbortSignal,
): Promise<Page<BankQuestion>> {
  const query = new URLSearchParams();
  if (params?.subject) query.set("subject", params.subject);
  if (params?.owner) query.set("owner", params.owner);
  appendPageParams(query, params);
  const value = query.toString();
  const data = await client<unknown>(`/bank-questions${value ? `?${value}` : ""}`, { signal });
  return normalizePage<BankQuestion>(data);
}
