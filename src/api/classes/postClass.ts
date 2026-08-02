import { client } from "../client";
import type { ClassGroup } from "../client";

export type CreateClassBody = { name: string; grade?: string; term_id?: string };

export function postClass(body: CreateClassBody): Promise<ClassGroup> {
  return client<ClassGroup>("/classes", { method: "POST", body });
}
