import type { Role } from "@/api/types";

const RANK: Record<Role, number> = {
  student: 0,
  teacher: 1,
  manager: 2,
  admin: 3,
};

export function hasMinRole(role: Role | undefined | null, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export function hasExactRole(role: Role | undefined | null, exact: Role): boolean {
  return role === exact;
}

export const ROLES: Role[] = ["student", "teacher", "manager", "admin"];
