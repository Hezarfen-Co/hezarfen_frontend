import { Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  getMyPaymentBalance,
  getMyPaymentStatement,
  getPaymentBalanceByUserId,
  getPaymentStatementByUserId,
  type StatementEntry,
} from "@/api/payments";
import { getMyStudents } from "@/api/parents";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDate } from "@/lib/format";
import { formatTry } from "@/lib/meals";
import { sortStatementEntries, statementStatus } from "@/lib/payments";
import { personLabel } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const STATEMENT_PAGE_SIZE = 12;

export default function PaymentStatementPage() {
  return (
    <RouteGuard>
      <StatementContent />
    </RouteGuard>
  );
}

function StatementContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  const moneyLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  const isParent = () => auth.user()!.role === "parent";

  const [children] = createResource(() => (isParent() ? getMyStudents({ limit: 100 }) : null));
  const [selectedChild, setSelectedChild] = createSignal("");
  createEffect(() => {
    if (isParent() && !selectedChild() && children()?.items[0]) setSelectedChild(children()!.items[0].id);
  });
  // Parent reads a child by id; everyone else reads their own record.
  const targetId = () => (isParent() ? selectedChild() : "");

  const [statement, { refetch }] = createResource(
    () => (isParent() ? targetId() || null : "me"),
    (key) => (key === "me" ? getMyPaymentStatement({ limit: 100 }) : getPaymentStatementByUserId(key, { limit: 100 })),
  );
  const [balance] = createResource(
    () => (isParent() ? targetId() || null : "me"),
    (key) => (key === "me" ? getMyPaymentBalance() : getPaymentBalanceByUserId(key)),
  );
  const entries = () => statement()?.entries.items ?? [];
  const summary = createMemo(() => {
    const rows = entries();
    return {
      billed: rows.filter((row) => !row.reversed).reduce((sum, row) => sum + row.amount_minor, 0),
      collected: rows.reduce((sum, row) => sum + row.credited_minor, 0),
      balance: statement()?.balance_minor ?? balance()?.balance_minor ?? 0,
    };
  });

  const columns = createMemo<ColumnDef<StatementEntry>[]>(() => [
    {
      id: "plan",
      header: t("payments.planName"),
      cell: (cell) => <span class="font-medium">{cell.row.original.plan_name ?? "—"}</span>,
    },
    {
      accessorKey: "amount_minor",
      header: t("payments.amountTry"),
      cell: (cell) => <span class="tabular-nums">{formatTry(cell.row.original.amount_minor, moneyLocale())}</span>,
    },
    {
      accessorKey: "due_at",
      header: t("payments.due"),
      cell: (cell) => <span class="mono text-sm" classList={{ "font-semibold text-destructive": cell.row.original.overdue }}>{cell.row.original.due_at == null ? "—" : formatDate(cell.row.original.due_at, locale())}</span>,
    },
    {
      accessorKey: "credited_minor",
      header: t("payments.credited"),
      cell: (cell) => <span class="tabular-nums">{formatTry(cell.row.original.credited_minor, moneyLocale())}</span>,
    },
    {
      accessorKey: "outstanding_minor",
      header: t("payments.outstanding"),
      cell: (cell) => <span class="tabular-nums">{formatTry(cell.row.original.outstanding_minor, moneyLocale())}</span>,
    },
    {
      id: "status",
      header: t("payments.status"),
      cell: (cell) => {
        const status = statementStatus(cell.row.original);
        return <Badge variant="outline" class={status.class}><span class={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />{t(status.key)}</Badge>;
      },
    },
  ]);

  return (
    <div class="space-y-6">
      <PageHeader
        accent="violet"
        eyebrow={t("nav.paymentStatement")}
        title={t("payments.statementTitle")}
        description={t("payments.statementSubtitle")}
      />

      <Show when={isParent()}>
        <div class="data-shell max-w-md p-4">
          <Label for="statement-child">{t("meals.child")}</Label>
          <SearchableSelect id="statement-child" value={selectedChild()} onChange={setSelectedChild} options={(children()?.items ?? []).map((child) => ({ value: child.id, label: personLabel(child) }))} />
        </div>
      </Show>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.totalDebt")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().billed, moneyLocale())}</p></div>
        <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.collected")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().collected, moneyLocale())}</p></div>
        <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.balance")}</p><p class="mt-1 text-2xl font-semibold tabular-nums" classList={{ "text-destructive": summary().balance < 0 }}>{formatTry(summary().balance, moneyLocale())}</p></div>
      </div>

      <section class="space-y-4">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={6} />}>
          <Show when={statement.error}>
            <ErrorAlert message={formatApiError(statement.error)} onRetry={() => void refetch()} />
          </Show>
          <Show when={entries().length > 0} fallback={<EmptyState title={t("payments.noStatement")} />}>
            <DataTable columns={columns()} data={sortStatementEntries(entries())} tableClass="min-w-160" enablePagination pageSize={STATEMENT_PAGE_SIZE} />
          </Show>
        </Suspense>
      </section>
    </div>
  );
}
