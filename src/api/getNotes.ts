import { client } from "./client";
import type { Note } from "./types";

export function getNotes(signal?: AbortSignal): Promise<Note[]> {
  return client<Note[]>("/notes", { signal });
}
