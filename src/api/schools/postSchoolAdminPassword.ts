import { client } from "../client";

export type SchoolAdminPasswordBody = {
  username: string;
  password: string;
};

// Re-keys an admin of that school and revokes every session the account held.
export function postSchoolAdminPassword(id: string, body: SchoolAdminPasswordBody): Promise<void> {
  return client<void>(`/schools/${encodeURIComponent(id)}/admin-password`, { method: "POST", body });
}
