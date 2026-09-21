import { createMediaQuery } from "@/lib/create-media-query";

/** Below Tailwind's `sm` breakpoint — the width where tables turn into cards. */
export const COMPACT_SCREEN_QUERY = "(max-width: 639px)";

/**
 * Rows per page on a phone for a list that shows `desktop` rows on a wide
 * screen. A table row becomes a four- or five-line card there, so the same
 * count is several screens tall: half as many, never fewer than five, and a
 * list that is already short keeps its own size.
 */
export function compactPageSize(desktop: number): number {
  return Math.min(desktop, Math.max(5, Math.ceil(desktop / 2)));
}

/**
 * A page size that follows the screen: `desktop` on wide screens,
 * `compactPageSize(desktop)` on phones. Callers that page on the server pass
 * the accessor into their fetch source, so a rotation refetches the right
 * slice; callers keeping a page index should reset it when this changes.
 */
export function createResponsivePageSize(desktop: number): () => number {
  const compact = createMediaQuery(COMPACT_SCREEN_QUERY);
  return () => (compact() ? compactPageSize(desktop) : desktop);
}
