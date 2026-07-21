import { client } from "../client";
import type { Note } from "../client";

export type PostNoteBody = {
  title: string;
  content?: string | null;
};

export function postNote(body: PostNoteBody): Promise<Note> {
  return client<Note>("/notes", { method: "POST", body });
}
