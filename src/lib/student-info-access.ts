import type { Role } from "@/api/client";

/**
 * Where the "student info" panel on a student's profile reads from, per viewer:
 *
 * - `self`   — the student themself: their own `GET /auth/me` row.
 * - `admin`  — `GET /users/{id}` (admin only): the full personal record.
 * - `staff`  — teacher / manager: `GET /users/{id}` is a 403 for them, so only
 *              the student number that `GET /users/search` carries.
 * - `parent` — a parent linked to this student (the profile itself is a 403 for
 *              any other parent): the student's ref from `GET /users/me/students`
 *              plus the parent's own `GET /auth/me` row.
 *
 * `null` hides the button: another student, or a non-student profile.
 */
export type StudentInfoSource = "self" | "admin" | "staff" | "parent";

export function studentInfoSource(
  viewer: { id: string; role: Role } | null | undefined,
  owner: { id: string; role: Role },
): StudentInfoSource | null {
  if (!viewer || owner.role !== "student") return null;
  if (viewer.id === owner.id) return "self";
  switch (viewer.role) {
    case "admin":
      return "admin";
    case "manager":
    case "teacher":
      return "staff";
    case "parent":
      return "parent";
    default:
      return null;
  }
}
