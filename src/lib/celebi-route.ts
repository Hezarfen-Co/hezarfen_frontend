/**
 * An answer may offer to take the user somewhere. The route arrives from the
 * backend, so it is treated as data: only an in-app absolute path is accepted,
 * which keeps `//evil.example` (protocol-relative), `javascript:` and every
 * other off-site target from ever reaching the router.
 */
export function safeCelebiRoute(route: string | null | undefined): string | null {
  if (typeof route !== "string") return null;
  const trimmed = route.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
  // Printable ASCII without spaces: a route is a path, and anything else in it
  // (control characters, line breaks) means it is not one.
  if (!/^[\x21-\x7e]+$/.test(trimmed)) return null;
  return trimmed;
}
