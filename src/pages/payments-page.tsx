import { For, Index, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  deletePaymentPlanById,
  getPaymentBalanceByUserId,
  getPaymentLedgerByUserId,
  getPaymentPlans,
  getPaymentStatementByUserId,
  getPlanAssignments,
  patchPaymentPlanById,
  postPaymentCredit,
  postPaymentPlan,
  postPaymentRefund,
  postPaymentReversal,
  postPlanAssignment,
  type FeePlan,
  type FeePlanInstallment,
  type PaymentLine,
  type StatementEntry,
} from "@/api/payments";
import { getUsers } from "@/api/users";
import { formatApiError, type User } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconChevronLeft, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatTry } from "@/lib/meals";
import { PAYMENT_METHOD_KEYS, sortStatementEntries, statementStatus } from "@/lib/payments";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PLAN_PAGE_SIZE = 12;
const STATEMENT_PAGE_SIZE = 15;

function dateInputFromMs(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function dateInputToMs(value: string): number | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

type LineAction = { line: PaymentLine; kind: "refund" | "reverse" };

export default function PaymentsPage() {
  return (
    <RouteGuard minRole="manager">
      <PaymentsContent />
    </RouteGuard>
  );
}

function PaymentsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const moneyLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  const [tab, setTab] = createSignal("collect");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  // ============================ Collection ============================
  const [selectedStudent, setSelectedStudent] = createSignal<User | null>(null);
  const student = () => selectedStudent()?.id ?? "";
  const studentLabel = (user: User) => `${user.name ?? ""} ${user.surname ?? ""}`.trim() || user.username;

  const [students, { refetch: refetchStudents }] = createResource(async () =>
    (await getUsers({ limit: 500 })).items.filter((user) => user.role === "student"),
  );
  const studentList = () => students() ?? [];

  // Filter the student list by fee plan (via that plan's assignment roster).
  const [planFilter, setPlanFilter] = createSignal("");
  const [filterAssignments] = createResource(
    () => planFilter() || null,
    (planId) => getPlanAssignments(planId, { limit: 500 }),
  );
  const filteredStudents = createMemo(() => {
    const all = studentList();
    if (!planFilter()) return all;
    const ids = new Set((filterAssignments()?.items ?? []).map((row) => row.student.id));
    return all.filter((user) => ids.has(user.id));
  });

  // Per-student balance for the "in debt / settled" column. No bulk endpoint
  // exists, so this is one call per listed student — bounded to a plan-sized
  // list. ponytail: N+1 balance fetch, capped at 200; add a bulk
  // /payments/balances endpoint if whole-school unfiltered debt is needed.
  const BALANCE_FETCH_CAP = 200;
  const [balances] = createResource(
    () => {
      const ids = filteredStudents().map((user) => user.id);
      return ids.length > 0 && ids.length <= BALANCE_FETCH_CAP ? ids : null;
    },
    async (ids) => {
      const pairs = await Promise.all(
        ids.map(async (id) => [id, (await getPaymentBalanceByUserId(id)).balance_minor] as const),
      );
      return Object.fromEntries(pairs) as Record<string, number>;
    },
  );
  const balanceOf = (id: string) => balances()?.[id];

  const studentColumns = createMemo<ColumnDef<User>[]>(() => [
    {
      id: "name",
      header: t("payments.student"),
      cell: (cell) => <span class="font-medium">{studentLabel(cell.row.original)}</span>,
    },
    {
      accessorKey: "username",
      header: t("payments.username"),
      cell: (cell) => <span class="text-sm text-muted-foreground">@{cell.row.original.username}</span>,
    },
    {
      id: "debt",
      header: t("payments.status"),
      accessorFn: (user) => balanceOf(user.id) ?? 0,
      cell: (cell) => {
        const bal = balanceOf(cell.row.original.id);
        if (bal === undefined) return <span class="text-sm text-muted-foreground">—</span>;
        const inDebt = bal < 0;
        return (
          <Badge variant="outline" class={inDebt ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}>
            <span class={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${inDebt ? "bg-red-500" : "bg-emerald-500"}`} />
            {inDebt ? t("payments.inDebt") : t("payments.settled")}
          </Badge>
        );
      },
    },
    {
      id: "balance",
      header: t("payments.balance"),
      accessorFn: (user) => balanceOf(user.id) ?? 0,
      cell: (cell) => {
        const bal = balanceOf(cell.row.original.id);
        return <span class="tabular-nums" classList={{ "text-destructive": (bal ?? 0) < 0 }}>{bal === undefined ? "—" : formatTry(bal, moneyLocale())}</span>;
      },
    },
  ]);

  const [statement, { refetch: refetchStatement }] = createResource(
    () => student() || null,
    (userId) => getPaymentStatementByUserId(userId, { limit: 500 }),
  );
  const [ledger, { refetch: refetchLedger }] = createResource(
    () => student() || null,
    (userId) => getPaymentLedgerByUserId(userId, { limit: 200 }),
  );
  const entries = () => statement()?.entries.items ?? [];
  const sortedEntries = () => sortStatementEntries(entries());
  const summary = createMemo(() => {
    const rows = entries();
    return {
      billed: rows.filter((row) => !row.reversed).reduce((sum, row) => sum + row.amount_minor, 0),
      collected: rows.reduce((sum, row) => sum + row.credited_minor, 0),
      overdue: rows.filter((row) => row.overdue).length,
      balance: statement()?.balance_minor ?? 0,
    };
  });

  const [collectEntry, setCollectEntry] = createSignal<StatementEntry | null>(null);
  const [collectAmount, setCollectAmount] = createSignal("");
  const [collectMethod, setCollectMethod] = createSignal("");
  const [collectNote, setCollectNote] = createSignal("");

  const openCollect = (entry: StatementEntry) => {
    setCollectEntry(entry);
    setCollectAmount(entry.outstanding_minor > 0 ? String(entry.outstanding_minor / 100) : "");
    setCollectMethod(t("payments.methodCash"));
    setCollectNote("");
    setError("");
  };
  const submitCollect = async (e: SubmitEvent) => {
    e.preventDefault();
    const entry = collectEntry();
    if (!entry) return;
    const amount_minor = Math.round(Number(collectAmount()) * 100);
    if (!(amount_minor > 0)) {
      setError(t("payments.amountTry"));
      return;
    }
    setPending(true);
    setError("");
    try {
      await postPaymentCredit({
        charge_id: entry.charge_id,
        amount_minor,
        method: collectMethod().trim() || undefined,
        note: collectNote().trim() || undefined,
        request_key: crypto.randomUUID(),
      });
      setCollectEntry(null);
      setFlash(t("common.saved"));
      await Promise.all([refetchStatement(), refetchLedger()]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const statementColumns = createMemo<ColumnDef<StatementEntry>[]>(() => [
    {
      id: "plan",
      header: t("payments.plan"),
      cell: (cell) => <span class="font-medium">{cell.row.original.plan_name ?? "—"}</span>,
    },
    {
      accessorKey: "due_at",
      header: t("payments.due"),
      cell: (cell) => <span class="mono text-sm" classList={{ "font-semibold text-destructive": cell.row.original.overdue }}>{cell.row.original.due_at == null ? "—" : formatDate(cell.row.original.due_at, locale())}</span>,
    },
    {
      accessorKey: "amount_minor",
      header: t("payments.amountTry"),
      cell: (cell) => <span class="tabular-nums">{formatTry(cell.row.original.amount_minor, moneyLocale())}</span>,
    },
    {
      accessorKey: "credited_minor",
      header: t("payments.collected"),
      cell: (cell) => <span class="tabular-nums text-muted-foreground">{formatTry(cell.row.original.credited_minor, moneyLocale())}</span>,
    },
    {
      accessorKey: "outstanding_minor",
      header: t("payments.outstanding"),
      cell: (cell) => <span class="font-semibold tabular-nums">{formatTry(cell.row.original.outstanding_minor, moneyLocale())}</span>,
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
      header: "",
      meta: { headerClass: "w-32 min-w-32 text-right", cellClass: "text-right" },
      cell: (cell) => (
        <Show when={!cell.row.original.reversed && cell.row.original.outstanding_minor > 0}>
          <Button size="sm" class="rounded-lg" onClick={() => openCollect(cell.row.original)}>{t("payments.collect")}</Button>
        </Show>
      ),
    },
  ]);

  // ---- account activity (advanced corrections) ----
  const [showLedger, setShowLedger] = createSignal(false);
  const [lineAction, setLineAction] = createSignal<LineAction | null>(null);
  const [actionAmount, setActionAmount] = createSignal("");
  const [actionNote, setActionNote] = createSignal("");
  const kindLabel = (kind: PaymentLine["kind"]) => t(`payments.kind${kind.charAt(0).toUpperCase()}${kind.slice(1)}` as never);
  const openLineAction = (line: PaymentLine, kind: LineAction["kind"]) => {
    setLineAction({ line, kind });
    setActionAmount(kind === "refund" ? String(line.amount_minor / 100) : "");
    setActionNote("");
    setError("");
  };
  const submitLineAction = async (e: SubmitEvent) => {
    e.preventDefault();
    const action = lineAction();
    if (!action) return;
    const note = actionNote().trim() || undefined;
    setPending(true);
    setError("");
    try {
      if (action.kind === "reverse") {
        await postPaymentReversal({ line_id: action.line.id, note });
      } else {
        const amount_minor = Math.round(Number(actionAmount()) * 100);
        if (!(amount_minor > 0)) {
          setError(t("payments.amountTry"));
          setPending(false);
          return;
        }
        await postPaymentRefund({ credit_id: action.line.id, amount_minor, note, request_key: crypto.randomUUID() });
      }
      setLineAction(null);
      setFlash(t("common.saved"));
      await Promise.all([refetchStatement(), refetchLedger()]);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  // ============================ Fee plans ============================
  const [plans, { refetch: refetchPlans }] = createResource(async () => (await getPaymentPlans({ limit: 100 })).items);
  const planList = () => plans() ?? [];
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<FeePlan | null>(null);
  const [planName, setPlanName] = createSignal("");
  const [rows, setRows] = createSignal<{ amount: string; due: string }[]>([{ amount: "", due: "" }]);
  const [deleteTarget, setDeleteTarget] = createSignal<FeePlan | null>(null);
  const [assignPlan, setAssignPlan] = createSignal<FeePlan | null>(null);
  const [assignStudent, setAssignStudent] = createSignal("");
  const [assignments, { refetch: refetchAssignments }] = createResource(
    () => assignPlan()?.id ?? null,
    (planId) => getPlanAssignments(planId, { limit: 200 }),
  );

  const planTotal = (plan: FeePlan) => plan.installments.reduce((sum, item) => sum + item.amount_minor, 0);
  const planColumns = createMemo<ColumnDef<FeePlan>[]>(() => [
    { accessorKey: "name", header: t("payments.planName"), cell: (cell) => <span class="font-medium">{cell.row.original.name}</span> },
    { id: "installments", header: t("payments.installments"), cell: (cell) => <span class="mono text-sm">{cell.row.original.installments.length}</span> },
    { id: "total", header: t("payments.total"), cell: (cell) => <span class="tabular-nums">{formatTry(planTotal(cell.row.original), moneyLocale())}</span> },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-40 min-w-40 text-right whitespace-nowrap", cellClass: "text-right" },
      cell: (cell) => (
        <div class="flex items-center justify-end gap-1">
          <Button size="sm" variant="outline" class="rounded-lg" onClick={() => openAssign(cell.row.original)}>
            <IconPlus class="h-4 w-4" />
            {t("payments.assign")}
          </Button>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => startEdit(cell.row.original) },
              { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
            ]}
          />
        </div>
      ),
    },
  ]);

  const resetPlanForm = () => {
    setPlanName("");
    setRows([{ amount: "", due: "" }]);
    setEditing(null);
    setError("");
  };
  const openCreate = () => {
    resetPlanForm();
    setPanelOpen(true);
  };
  const startEdit = (plan: FeePlan) => {
    setEditing(plan);
    setPlanName(plan.name);
    setRows(plan.installments.map((item) => ({ amount: String(item.amount_minor / 100), due: dateInputFromMs(item.due_at) })));
    setError("");
    setPanelOpen(true);
  };
  const addRow = () => setRows([...rows(), { amount: "", due: "" }]);
  const removeRow = (idx: number) => setRows(rows().filter((_, i) => i !== idx));
  const setRowAmount = (idx: number, value: string) => setRows(rows().map((r, i) => (i === idx ? { ...r, amount: value } : r)));
  const setRowDue = (idx: number, value: string) => setRows(rows().map((r, i) => (i === idx ? { ...r, due: value } : r)));

  const savePlan = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    const installments: FeePlanInstallment[] = [];
    for (const row of rows()) {
      const amount_minor = Math.round(Number(row.amount) * 100);
      const due_at = dateInputToMs(row.due);
      if (!(amount_minor > 0) || due_at == null) {
        setError(t("terms.dateRequired"));
        return;
      }
      installments.push({ amount_minor, due_at });
    }
    setPending(true);
    try {
      const current = editing();
      if (current) {
        await patchPaymentPlanById(current.id, { name: planName().trim(), installments });
        setFlash(t("common.saved"));
      } else {
        await postPaymentPlan({ name: planName().trim(), installments });
        setFlash(t("common.created"));
      }
      resetPlanForm();
      setPanelOpen(false);
      await refetchPlans();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const openAssign = (plan: FeePlan) => {
    setAssignPlan(plan);
    setAssignStudent("");
    setError("");
  };
  const submitAssign = async () => {
    const plan = assignPlan();
    const target = assignStudent();
    if (!plan || !target) return;
    setPending(true);
    setError("");
    try {
      const outcomes = await postPlanAssignment(plan.id, { student_ids: [target] });
      const outcome = outcomes[0];
      const key = outcome?.status === "assigned" ? "payments.outcomeAssigned" : outcome?.status === "already_assigned" ? "payments.outcomeAlready" : "payments.outcomeRejected";
      setFlash(t(key as never));
      setAssignStudent("");
      await refetchAssignments();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const globalError = () => error() && !panelOpen() && !assignPlan() && !collectEntry() && !lineAction();

  return (
    <div class="space-y-6">
      <PageHeader eyebrow={t("nav.school")} title={t("payments.title")} description={t("payments.subtitle")} />

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={globalError()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Tabs value={tab()} onChange={setTab}>
        <TabsList>
          <TabsTrigger value="collect">{t("payments.tabCollect")}</TabsTrigger>
          <TabsTrigger value="plans">{t("payments.tabPlans")}</TabsTrigger>
        </TabsList>

        {/* ---------------- Collection ---------------- */}
        <TabsContent value="collect" class="space-y-5">
          <Show
            when={selectedStudent()}
            fallback={
              <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
              <Suspense fallback={<DataTableSkeleton columns={4} rows={8} />}>
                <Show when={students.error}>
                  <ErrorAlert message={formatApiError(students.error)} onRetry={() => void refetchStudents()} />
                </Show>
                <Show when={studentList().length > 0} fallback={<EmptyState title={t("payments.selectStudent")} />}>
                  <DataTable
                    columns={studentColumns()}
                    data={filteredStudents()}
                    onRowClick={(user) => setSelectedStudent(user)}
                    searchPredicate={(user, q) => `${studentLabel(user)} ${user.username} ${user.email ?? ""}`.toLowerCase().includes(q.toLowerCase())}
                    filterPlaceholder={t("payments.selectStudent")}
                    title={t("payments.selectStudent")}
                    filters={
                      <Select value={planFilter()} onChange={(e) => setPlanFilter(e.currentTarget.value)} wrapperClass="w-56">
                        <option value="">{t("payments.allPlans")}</option>
                        <For each={planList()}>{(plan) => <option value={plan.id}>{plan.name}</option>}</For>
                      </Select>
                    }
                    tableClass="min-w-160"
                    enableSorting
                    enablePagination
                    pageSize={STATEMENT_PAGE_SIZE}
                  />
                </Show>
              </Suspense>
              </section>
            }
          >
            {(current) => (<>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">{studentLabel(current())}</h2>
                <p class="text-sm text-muted-foreground">@{current().username}</p>
              </div>
              <Button variant="outline" size="sm" class="rounded-lg" onClick={() => setSelectedStudent(null)}>
                <IconChevronLeft class="h-4 w-4" />{t("payments.allStudents")}
              </Button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.totalDebt")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().billed, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.collected")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().collected, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.balance")}</p><p class="mt-1 font-semibold tabular-nums" classList={{ "text-destructive": summary().balance < 0 }}>{formatTry(summary().balance, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs uppercase text-muted-foreground">{t("payments.overdueCount")}</p><p class="mt-1 font-semibold tabular-nums" classList={{ "text-destructive": summary().overdue > 0 }}>{summary().overdue}</p></div>
            </div>

            <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
              <Suspense fallback={<DataTableSkeleton columns={7} rows={5} />}>
                <Show when={statement.error}>
                  <ErrorAlert message={formatApiError(statement.error)} onRetry={() => void refetchStatement()} />
                </Show>
                <Show
                  when={entries().length > 0}
                  fallback={
                    <div class="space-y-3">
                      <EmptyState title={t("payments.noDebt")} description={t("payments.noDebtHint")} />
                      <div class="flex justify-center">
                        <Button variant="outline" size="sm" class="rounded-lg" onClick={() => setTab("plans")}>{t("payments.tabPlans")}</Button>
                      </div>
                    </div>
                  }
                >
                  <DataTable columns={statementColumns()} data={sortedEntries()} tableClass="min-w-180" enablePagination pageSize={STATEMENT_PAGE_SIZE} />
                </Show>
              </Suspense>
            </section>

            {/* advanced corrections, folded away */}
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowLedger(!showLedger())}>{showLedger() ? t("payments.hideLedger") : t("payments.showLedger")}</Button>
              <Show when={showLedger()}>
                <section class="data-shell mt-3 space-y-1 p-4">
                  <div class="mb-2">
                    <h2 class="font-semibold">{t("payments.ledgerAudit")}</h2>
                    <p class="text-xs text-muted-foreground">{t("payments.appendOnly")}</p>
                  </div>
                  <div class="divide-y divide-border/60">
                    <For each={ledger()?.items ?? []}>
                      {(line) => (
                        <div class="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                          <div>
                            <p class="font-medium">{kindLabel(line.kind)}</p>
                            <p class="text-xs text-muted-foreground">{line.note || line.method || "—"} · {formatDateTime(line.created_at, locale())}</p>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="font-semibold tabular-nums">{line.kind === "charge" || line.kind === "refund" ? "−" : "+"}{formatTry(line.amount_minor, moneyLocale())}</span>
                            <Show when={line.kind === "credit"}>
                              <Button size="sm" variant="outline" onClick={() => openLineAction(line, "refund")}>{t("payments.recordRefund")}</Button>
                            </Show>
                            <Show when={line.kind === "charge" || line.kind === "refund"}>
                              <Button size="sm" variant="ghost" class="text-destructive" onClick={() => openLineAction(line, "reverse")}>{t("payments.reverse")}</Button>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                    <Show when={(ledger()?.items.length ?? 0) === 0}>
                      <p class="py-2 text-sm text-muted-foreground">{t("payments.noLedger")}</p>
                    </Show>
                  </div>
                </section>
              </Show>
            </div>
            </>)}
          </Show>
        </TabsContent>

        {/* ---------------- Fee plans ---------------- */}
        <TabsContent value="plans" class="space-y-4">
          <div class="flex justify-end">
            <Button type="button" size="sm" class="min-w-30 rounded-lg" onClick={openCreate}>
              <IconPlus class="h-4 w-4" />
              {t("payments.createPlan")}
            </Button>
          </div>
          <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
            <Suspense fallback={<DataTableSkeleton columns={4} rows={6} />}>
              <Show when={plans.error}>
                <ErrorAlert message={formatApiError(plans.error)} onRetry={() => void refetchPlans()} />
              </Show>
              <Show when={planList().length > 0} fallback={<EmptyState title={t("payments.empty")} />}>
                <DataTable columns={planColumns()} data={planList()} onRowClick={(plan) => { setPlanFilter(plan.id); setTab("collect"); }} tableClass="min-w-160" filterColumn="name" enablePagination pageSize={PLAN_PAGE_SIZE} />
              </Show>
            </Suspense>
          </section>
        </TabsContent>
      </Tabs>

      {/* ---------------- Collect payment panel ---------------- */}
      <SidePanel
        open={collectEntry() != null}
        onOpenChange={(open) => { if (!open) setCollectEntry(null); }}
        title={t("payments.collectFrom")}
        description={collectEntry() ? `${collectEntry()!.plan_name ?? "—"} · ${t("payments.outstanding")}: ${formatTry(collectEntry()!.outstanding_minor, moneyLocale())}` : ""}
      >
        <form class="space-y-4" onSubmit={submitCollect}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="collect-amount">{t("payments.amountTry")}</Label>
            <Input id="collect-amount" type="number" min={0.01} step={0.01} required value={collectAmount()} onInput={(e) => setCollectAmount(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="collect-method">{t("payments.method")}</Label>
            <Select id="collect-method" value={collectMethod()} onChange={(e) => setCollectMethod(e.currentTarget.value)}>
              <For each={PAYMENT_METHOD_KEYS}>{(key) => <option value={t(key)}>{t(key)}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="collect-note">{t("payments.note")}</Label>
            <Textarea id="collect-note" maxlength={500} value={collectNote()} onInput={(e) => setCollectNote(e.currentTarget.value)} />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setCollectEntry(null)}>{t("common.cancel")}</Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>{t("payments.collect")}</Button>
          </div>
        </form>
      </SidePanel>

      {/* ---------------- Correction panel (refund / reverse) ---------------- */}
      <SidePanel
        open={lineAction() != null}
        onOpenChange={(open) => { if (!open) setLineAction(null); }}
        title={lineAction()?.kind === "refund" ? t("payments.recordRefund") : t("payments.reverse")}
        description={lineAction() ? `${kindLabel(lineAction()!.line.kind)} · ${formatTry(lineAction()!.line.amount_minor, moneyLocale())}` : ""}
      >
        <form class="space-y-4" onSubmit={submitLineAction}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <Show when={lineAction()?.kind === "refund"}>
            <div class="space-y-1.5">
              <Label for="correction-amount">{t("payments.amountTry")}</Label>
              <Input id="correction-amount" type="number" min={0.01} step={0.01} required value={actionAmount()} onInput={(e) => setActionAmount(e.currentTarget.value)} />
            </div>
          </Show>
          <div class="space-y-1.5">
            <Label for="correction-note">{lineAction()?.kind === "reverse" ? t("payments.reason") : t("payments.note")}</Label>
            <Textarea id="correction-note" maxlength={500} value={actionNote()} onInput={(e) => setActionNote(e.currentTarget.value)} />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setLineAction(null)}>{t("common.cancel")}</Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>{t("common.save")}</Button>
          </div>
        </form>
      </SidePanel>

      {/* ---------------- Plan create / edit ---------------- */}
      <SidePanel open={panelOpen()} onOpenChange={(open) => { setPanelOpen(open); if (!open) resetPlanForm(); }} title={editing() ? t("payments.editPlan") : t("payments.createPlan")} description={t("payments.subtitle")}>
        <form class="space-y-4" onSubmit={savePlan}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="plan-name">{t("payments.planName")}</Label>
            <Input id="plan-name" class="rounded-lg" required maxlength={120} value={planName()} onInput={(e) => setPlanName(e.currentTarget.value)} />
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <Label>{t("payments.installments")}</Label>
              <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={addRow}>
                <IconPlus class="h-4 w-4" />
                {t("payments.addInstallment")}
              </Button>
            </div>
            <Index each={rows()}>
              {(row, idx) => (
                <div class="flex flex-wrap items-end gap-2">
                  <div class="min-w-32 flex-1 space-y-1.5">
                    <Label for={`inst-amount-${idx}`}>{t("payments.amountTry")}</Label>
                    <Input id={`inst-amount-${idx}`} type="number" min={0.01} step={0.01} required value={row().amount} onInput={(e) => setRowAmount(idx, e.currentTarget.value)} />
                  </div>
                  <div class="min-w-40 flex-1 space-y-1.5">
                    <Label for={`inst-due-${idx}`}>{t("payments.dueDate")}</Label>
                    <DatePicker id={`inst-due-${idx}`} placeholder={t("form.datePlaceholder")} required value={row().due} onChange={(value) => setRowDue(idx, value)} />
                  </div>
                  <Show when={rows().length > 1}>
                    <Button type="button" variant="ghost" size="sm" class="text-destructive" onClick={() => removeRow(idx)}>
                      <IconTrash class="h-4 w-4" />
                    </Button>
                  </Show>
                </div>
              )}
            </Index>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setPanelOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>{editing() ? t("common.update") : t("common.create")}</Button>
          </div>
        </form>
      </SidePanel>

      {/* ---------------- Assign ---------------- */}
      <SidePanel open={assignPlan() != null} onOpenChange={(open) => { if (!open) setAssignPlan(null); }} title={t("payments.assign")} description={assignPlan()?.name ?? ""}>
        <div class="space-y-4">
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <p class="text-sm text-muted-foreground">{t("payments.assignHelp")}</p>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div class="min-w-0 flex-1">
              <UserSearchSelect id="assign-student" role="student" value={assignStudent()} onChange={setAssignStudent} label={t("payments.selectStudent")} placeholder={t("payments.selectStudent")} />
            </div>
            <Button disabled={!assignStudent() || pending()} onClick={() => void submitAssign()}>{t("payments.assign")}</Button>
          </div>
          <div class="space-y-2">
            <Label>{t("payments.assignments")}</Label>
            <div class="divide-y divide-border/60">
              <For each={assignments()?.items ?? []}>
                {(row) => (
                  <div class="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{personLabel(row.student)}</span>
                    <span class="text-xs text-muted-foreground">{formatDateTime(row.created_at, locale())}</span>
                  </div>
                )}
              </For>
              <Show when={(assignments()?.items.length ?? 0) === 0}>
                <p class="py-2 text-sm text-muted-foreground">{t("payments.noAssignments")}</p>
              </Show>
            </div>
          </div>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("payments.deletePlan")}
        variant="destructive"
        summary={deleteTarget()?.name ?? ""}
        onConfirm={async () => {
          const plan = deleteTarget();
          if (!plan) return;
          try {
            await deletePaymentPlanById(plan.id);
            await refetchPlans();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
