import type { Term } from "@/api/client";

/**
 * The dönem a new record most likely belongs to: the open term whose date
 * range contains `now`, else the nearest one still to come, else the first
 * listed. Archived terms are only considered when every term is archived.
 */
export function pickCurrentTerm(terms: readonly Term[], now: number): Term | undefined {
  const open = terms.filter((term) => term.archived_at == null);
  const pool = open.length > 0 ? open : terms;
  const current = pool.find((term) => term.starts_at <= now && now <= term.ends_at);
  if (current) return current;
  const upcoming = pool
    .filter((term) => term.starts_at > now)
    .sort((a, b) => a.starts_at - b.starts_at)[0];
  return upcoming ?? pool[0];
}
