import { ApiError } from "@/api/client";

/** A read that failed because the record is not there (deleted, or a bad link). */
export function isNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

// Detail routes whose parent path is not a list page of their own.
const LIST_OVERRIDES: Record<string, string> = {
  "/instances": "/courses",
};

/**
 * The list a detail URL belongs to: its path minus the last segment
 * (`/management/classes/abc` → `/management/classes`), when that is a route
 * the app has; otherwise the home page.
 */
export function listPathFor(pathname: string, hasRoute: (path: string) => boolean): string {
  const trimmed = pathname.replace(/\/+$/, "");
  const parent = trimmed.slice(0, trimmed.lastIndexOf("/"));
  if (!parent) return "/";
  const target = LIST_OVERRIDES[parent] ?? parent;
  return hasRoute(target) ? target : "/";
}
