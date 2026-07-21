import { client } from "../client";
import type { Page, PageParams } from "../client";
import type { PersonRef } from "../client";

export async function getParentStudents(id: string, params?: PageParams): Promise<Page<PersonRef>> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString());
  
  const query = searchParams.toString();
  const url = query ? `/users/${id}/students?${query}` : `/users/${id}/students`;
  
  return client(url);
}
