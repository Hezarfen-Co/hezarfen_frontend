import { client } from "../client";
import type { Board } from "./types";

// One board — a 404 (never 403) for anyone not on it.
export function getBoardById(id: string, signal?: AbortSignal): Promise<Board> {
  return client<Board>(`/boards/${encodeURIComponent(id)}`, { signal });
}
