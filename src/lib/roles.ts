import type { Role } from "@/api/client";

const RANK: Record<Role, number> = {
  parent: -1,
  student: 0,
  teacher: 1,
  manager: 2,
  admin: 3,
};

export function hasMinRole(role: Role | undefined | null, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export function hasMaxRole(role: Role | undefined | null, max: Role): boolean {
  if (!role) return false;
  return RANK[role] <= RANK[max];
}

export function hasExactRole(role: Role | undefined | null, exact: Role): boolean {
  return role === exact;
}

/** Inclusive role band: minRole <= role <= maxRole. */
export function roleInRange(
  role: Role | undefined | null,
  min?: Role,
  max?: Role,
): boolean {
  if (!role) return false;
  if (min && !hasMinRole(role, min)) return false;
  if (max && !hasMaxRole(role, max)) return false;
  return true;
}

export const ROLES: Role[] = ["student", "parent", "teacher", "manager", "admin"];
