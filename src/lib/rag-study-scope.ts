import type { RagCitation, RagStudyScope } from "@/api/client";

/** Longest range label sent with a study request. */
const LABEL_MAX = 120;

/**
 * The study range behind one answer: the subject most of its citations come
 * from, and exactly the passages (span ids) and pages they cite there. A
 * study request covers one corpus, so citations from another subject are
 * left out rather than mixed in. Null when no citation names a subject — the
 * service needs `ders`, and guessing one would study the wrong material.
 */
export function scopeFromCitations(citations: RagCitation[], label?: string): RagStudyScope | null {
  const bySubject = new Map<string, RagCitation[]>();
  for (const citation of citations) {
    const ders = citation.ders?.trim();
    if (!ders || citation.span_ids.length === 0) continue;
    bySubject.set(ders, [...(bySubject.get(ders) ?? []), citation]);
  }
  let best: [string, RagCitation[]] | null = null;
  for (const entry of bySubject) if (!best || entry[1].length > best[1].length) best = entry;
  if (!best) return null;
  const [ders, cited] = best;
  const trimmed = label?.trim();
  return {
    ders,
    span_ids: [...new Set(cited.flatMap((citation) => citation.span_ids))],
    pages: [...new Set(cited.flatMap((citation) => citation.pages))].sort((a, b) => a - b),
    scope_label: trimmed ? trimmed.slice(0, LABEL_MAX) : null,
  };
}
