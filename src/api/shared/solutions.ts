import { client, formClient } from "../client";
import type { Page, PageParams } from "../client";
import type { PersonRef } from "../client";

import { type PoolImageMeta } from "./questions";

export interface SolutionResponse {
  id: string;
  question: string;
  author: PersonRef;
  body: string;
  offered_at: number;
  /** null when there is no image */
  image: PoolImageMeta | null;
}

export interface OfferSolution {
  body: string;
}

export async function getSolutions(
  id: string,
  params?: PageParams
): Promise<Page<SolutionResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString());

  const query = searchParams.toString();
  const url = query ? `/questions/${id}/solutions?${query}` : `/questions/${id}/solutions`;
  return client(url);
}

export async function postSolution(
  id: string,
  body: OfferSolution,
  image?: File
): Promise<SolutionResponse> {
  const res = await client<SolutionResponse>(`/questions/${id}/solutions`, {
    method: "POST",
    body,
  });

  if (image) {
    const fd = new FormData();
    fd.append("file", image);
    await formClient(`/questions/${id}/solutions/${res.id}/image`, fd);
  }

  return res;
}

export async function patchSolutionById(
  id: string,
  sid: string,
  body: OfferSolution
): Promise<SolutionResponse> {
  return client(`/questions/${id}/solutions/${sid}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteSolutionById(id: string, sid: string): Promise<void> {
  return client(`/questions/${id}/solutions/${sid}`, {
    method: "DELETE",
  });
}

export function getSolutionImageUrl(id: string, sid: string): string {
  return `/api/questions/${id}/solutions/${sid}/image`;
}
