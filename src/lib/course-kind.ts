import type { MessageKey } from "@/i18n/messages";

// `kind` is an open string on the wire, so a value this build has no copy for
// falls back to itself rather than rendering a missing translation key.
const KNOWN_KINDS = new Set(["course", "study", "club"]);

export function courseKindLabel(kind: string, t: (key: MessageKey) => string): string {
  return KNOWN_KINDS.has(kind) ? t(`courses.kind.${kind}Singular` as MessageKey) : kind;
}
