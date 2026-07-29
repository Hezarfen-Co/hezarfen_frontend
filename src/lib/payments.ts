import type { StatementEntry } from "@/api/payments";
import type { MessageKey } from "@/i18n/messages";

export type StatementStatus = {
  key: MessageKey;
  // Badge color classes (used with Badge variant="outline") and a matching dot.
  class: string;
  dot: string;
};

// A charge's status, mirrored from the backend rollup fields, in the finance
// operator's vocabulary (paid / partial / overdue / pending / cancelled), with
// receivables-aging colors: green current/paid, amber partial, red overdue.
export function statementStatus(entry: StatementEntry): StatementStatus {
  if (entry.reversed) return { key: "payments.statusCancelled", class: "border-border bg-muted/40 text-muted-foreground", dot: "bg-muted-foreground/50" };
  if (entry.outstanding_minor <= 0) return { key: "payments.paid", class: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" };
  if (entry.overdue) return { key: "payments.overdue", class: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300", dot: "bg-red-500" };
  if (entry.credited_minor > 0) return { key: "payments.statusPartial", class: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200", dot: "bg-amber-500" };
  return { key: "payments.statusPending", class: "border-border bg-background/50 text-muted-foreground", dot: "bg-muted-foreground/40" };
}

// Sort rank for a receivables list: overdue first, then unpaid by due date,
// then settled, then cancelled last.
export function statementSortRank(entry: StatementEntry): number {
  if (entry.reversed) return 3;
  if (entry.outstanding_minor <= 0) return 2;
  if (entry.overdue) return 0;
  return 1;
}

export function sortStatementEntries(entries: StatementEntry[]): StatementEntry[] {
  return [...entries].sort(
    (a, b) => statementSortRank(a) - statementSortRank(b) || (a.due_at ?? Infinity) - (b.due_at ?? Infinity),
  );
}

// Common collection methods. Values are stored as free text on the ledger line,
// so the localized label is what a receipt shows.
export const PAYMENT_METHOD_KEYS: MessageKey[] = [
  "payments.methodCash",
  "payments.methodTransfer",
  "payments.methodCard",
  "payments.methodCheck",
];
