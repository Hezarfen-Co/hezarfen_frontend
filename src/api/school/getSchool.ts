import { client } from "../client";

/** The school behind the session cookie: its registry uuid and display name, nothing more. */
export type SchoolIdentity = {
  id: string;
  name: string;
};

/**
 * The caller's own school. Any school role may read it, student and parent
 * included; a builder cookie names no school and is refused with 401.
 */
export function getSchool(signal?: AbortSignal): Promise<SchoolIdentity> {
  return client<SchoolIdentity>("/school", { signal });
}
