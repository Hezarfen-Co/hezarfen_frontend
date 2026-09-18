import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
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
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DetailField } from "@/components/ui/detail-field";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDate } from "@/lib/format";
import { formatTry } from "@/lib/meals";
import { sortStatementEntries, statementStatus } from "@/lib/payments";
import { personLabel } from "@/lib/person";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const STATEMENT_PAGE_SIZE = 10;

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
  const [viewEntry, setViewEntry] = createSignal<StatementEntry | null>(null);
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
      cell: (cell) => <span class="block truncate font-medium">{cell.row.original.plan_name ?? "—"}</span>,
    },
    {
      accessorKey: "due_at",
      header: t("payments.due"),
      cell: (cell) => <span class="mono block whitespace-nowrap text-sm" classList={{ "font-semibold text-destructive-text": cell.row.original.overdue }}>{cell.row.original.due_at == null ? "—" : formatDate(cell.row.original.due_at, locale())}</span>,
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
    {
      id: "actions",
      header: t("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("common.view"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => setViewEntry(cell.row.original),
          }]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <Show when={isParent()}>
        <div class="data-shell max-w-md p-4">
          <Label for="statement-child">{t("meals.child")}</Label>
          <SearchableSelect id="statement-child" value={selectedChild()} onChange={setSelectedChild} options={(children()?.items ?? []).map((child) => ({ value: child.id, label: personLabel(child) }))} />
        </div>
      </Show>

      <section class="data-shell p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-sm font-medium text-text-subtle">{t("payments.collected")}</p>
          <p class="mono text-lg font-semibold tabular-nums text-text-strong">
            {formatTry(summary().collected, moneyLocale())}
            <span class="font-normal text-text-subtle"> / {formatTry(summary().billed, moneyLocale())}</span>
          </p>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-tint">
          <div
            class="h-full rounded-full bg-primary"
            style={{ width: `${summary().billed > 0 ? Math.max(0, Math.min(100, Math.round((summary().collected / summary().billed) * 100))) : 0}%` }}
          />
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p class="text-xs font-medium text-text-subtle">{t("payments.totalDebt")}</p>
            <p class="mt-1 font-semibold tabular-nums text-text-strong">{formatTry(summary().billed, moneyLocale())}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-text-subtle">{t("payments.balance")}</p>
            <p class="mt-1 text-2xl font-semibold tabular-nums" classList={{ "text-destructive-text": summary().balance < 0 }}>{formatTry(summary().balance, moneyLocale())}</p>
          </div>
        </div>
      </section>

      <section class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={5} rows={6} />}>
          <Show when={statement.error}>
            <ErrorAlert message={formatApiError(statement.error)} onRetry={() => void refetch()} />
          </Show>
          <DataTable
              title={t("payments.statementTitle")}
              description={t("payments.statementSubtitle")}
              empty={t("payments.noStatement")}
              columns={columns()}
              data={sortStatementEntries(entries())}
              tableClass="min-w-160"
              storageKey="my-payment-statement"
              enablePagination
              pageSize={STATEMENT_PAGE_SIZE}
              onRowClick={setViewEntry}
            />
        </Suspense>
      </section>

      <SidePanel
        open={viewEntry() != null}
        onOpenChange={(open) => { if (!open) setViewEntry(null); }}
        title={viewEntry()?.plan_name ?? t("payments.plan")}
        description={viewEntry()?.due_at == null ? "—" : formatDate(viewEntry()!.due_at, locale())}
      >
        <Show when={viewEntry()} keyed>
          {(entry) => (
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label={t("payments.amountTry")} value={formatTry(entry.amount_minor, moneyLocale())} />
              <DetailField label={t("payments.credited")} value={formatTry(entry.credited_minor, moneyLocale())} />
              <DetailField label={t("payments.outstanding")} value={formatTry(entry.outstanding_minor, moneyLocale())} />
              <DetailField label={t("payments.reversed")} value={entry.reversed ? t("payments.reversed") : "—"} />
              <DetailField label={t("payments.plan")} value={entry.plan ?? "—"} mono />
              <DetailField label={t("admin.id")} value={entry.charge_id} mono />
            </div>
          )}
        </Show>
      </SidePanel>
    </div>
  );
}
