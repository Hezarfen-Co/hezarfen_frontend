import { client } from "../client";
import type { SchoolChoice } from "./postLogin";

/** Active schools a new account can join. Unauthenticated, same as register. */
export function getRegisterSchools(signal?: AbortSignal): Promise<SchoolChoice[]> {
  return client<SchoolChoice[]>("/auth/schools", { signal });
}
