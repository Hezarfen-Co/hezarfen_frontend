import { client, formClient } from "../client";
import type { Page, PageParams } from "../client";
import type { PersonRef } from "../client";

export interface PoolImageMeta {
  content_type: string;
  size: number;
}

export interface PoolQuestionResponse {
  id: string;
  /** The student who asked — field is `asker` on the backend */
  asker: PersonRef;
  title: string;
  body: string;
  status: "pending" | "approved";
  asked_at: number;
  approved_by: PersonRef | null;
  /** null when there is no image */
  image: PoolImageMeta | null;
  solution_count: number;
}

export interface AskQuestion {
  title: string;
  body: string;
}

export async function getQuestions(
  status?: "pending" | "approved",
  params?: PageParams
): Promise<Page<PoolQuestionResponse>> {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set("status", status);
  if (params?.limit !== undefined) searchParams.set("limit", params.limit.toString());
  if (params?.offset !== undefined) searchParams.set("offset", params.offset.toString());

  const query = searchParams.toString();
  const url = query ? `/questions?${query}` : "/questions";
  return client(url);
}

export async function getQuestionById(id: string): Promise<PoolQuestionResponse> {
  return client(`/questions/${id}`);
}

export async function postQuestion(body: AskQuestion, image?: File): Promise<PoolQuestionResponse> {
  const res = await client<PoolQuestionResponse>("/questions", {
    method: "POST",
    body,
  });

  if (image) {
    const fd = new FormData();
    fd.append("file", image);
    await formClient(`/questions/${res.id}/image`, fd);
  }

  return res;
}

export async function postQuestionApprove(id: string): Promise<PoolQuestionResponse> {
  return client(`/questions/${id}/approve`, {
    method: "POST",
  });
}

export async function deleteQuestionById(id: string): Promise<void> {
  return client(`/questions/${id}`, {
    method: "DELETE",
  });
}

export function getQuestionImageUrl(id: string): string {
  return `/api/questions/${id}/image`;
}
