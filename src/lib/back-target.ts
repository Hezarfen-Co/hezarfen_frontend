/**
 * Where the shell's back button goes when there is no in-app history entry to
 * return to (a deep link, a new tab, a reload). Going `history.back()` there
 * leaves the app, so we walk up the path to the nearest route that exists.
 */

/** Detail routes whose natural parent is not their path prefix. */
const PARENT_OVERRIDES: Record<string, string> = {
  instances: "/courses",
  "exam-room": "/exams",
  profile: "/",
};

const matches = (pattern: string, segments: string[]) => {
  const parts = pattern.split("/").filter(Boolean);
  return parts.length === segments.length && parts.every((part, i) => part.startsWith("$") || part === segments[i]);
};

/**
 * @param pathname current location pathname
 * @param routePaths every registered route path, e.g. `/exams/$id`
 */
export function backTarget(pathname: string, routePaths: readonly string[]): string {
  const segments = pathname.split("/").filter(Boolean);
  const override = segments.length > 1 ? PARENT_OVERRIDES[segments[0]] : undefined;
  if (override && segments.length === 2) return override;

  for (let depth = segments.length - 1; depth > 0; depth -= 1) {
    const candidate = segments.slice(0, depth);
    if (routePaths.some((pattern) => matches(pattern, candidate))) return `/${candidate.join("/")}`;
  }
  return "/";
}
