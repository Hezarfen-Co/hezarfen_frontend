import { client } from "../client";
import type { User } from "../client";

// Support access: swaps the builder cookie for an ordinary session of one of
// the school's admins. Refused (403) on a suspended school.
export function postSchoolEnter(id: string, body: { username: string }): Promise<User> {
  return client<User>(`/schools/${encodeURIComponent(id)}/enter`, { method: "POST", body });
}
