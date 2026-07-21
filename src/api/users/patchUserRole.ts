import { client } from "../client";
import type { Role, User } from "../client";

export function patchUserRole(id: string, role: Role): Promise<User> {
  return client<User>(`/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
}
