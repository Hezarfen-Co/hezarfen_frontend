import { useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Index, Show, Suspense, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
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
import { getUserProfile, getUserSearch } from "@/api/users";
import { formatApiError, type PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { DetailField } from "@/components/ui/detail-field";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconChevronLeft, IconEdit, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { createUrlString } from "@/lib/url-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatTry } from "@/lib/meals";
import { PAYMENT_METHOD_KEYS, sortStatementEntries, statementStatus } from "@/lib/payments";
import { matchesSearch } from "@/lib/search-text";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PLAN_PAGE_SIZE = 10;
const STATEMENT_PAGE_SIZE = 15;
const STUDENT_PAGE_SIZE = 10;
const MAX_PLAN_ASSIGNMENT_STUDENTS = 200;
const CUSTOM_PAYMENT_METHOD = "__custom__";

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
type PaymentStudentRow = PersonRef & { balance_minor: number | null };

export default function PaymentsPage() {
  return (
    <RouteGuard minRole="manager">
      <PaymentsContent />
    </RouteGuard>
  );
}

function PaymentsContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const moneyLocale = () => (locale() === "tr" ? "tr-TR" : "en-US");
  // Tab, student search and plan filter ride in the URL: Back from a
  // student's statement lands on the same filtered list.
  const [tab, setTab] = createUrlString("tab", "collect");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  // ============================ Collection ============================
  const [selectedStudent, setSelectedStudent] = createSignal<PersonRef | null>(null);
  const routeStudentId = createMemo(() => {
    const prefix = "/management/payments/";
    return location().pathname.startsWith(prefix) ? decodeURIComponent(location().pathname.slice(prefix.length)) : null;
  });
  const student = () => selectedStudent()?.id ?? "";

  const [planFilter, setPlanFilter] = createUrlString("plan");
  const [studentQuery, setStudentQuery] = createUrlString("q");
  // Debounced so typing doesn't fire a search request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = createSignal(studentQuery().trim());
  let queryTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const q = studentQuery();
    clearTimeout(queryTimer);
    queryTimer = setTimeout(() => setDebouncedQuery(q.trim()), 300);
  });
  onCleanup(() => clearTimeout(queryTimer));

  const [studentPage, setStudentPage] = createSignal(0);
  const studentPageSize = createResponsivePageSize(STUDENT_PAGE_SIZE);
  // Reset to page 1 whenever the query, plan filter or page size changes underneath it.
  createEffect(() => {
    debouncedQuery();
    planFilter();
    studentPageSize();
    setStudentPage(0);
  });

  // `GET /users` is admin-only on the backend (this page is manager+), and a
  // full-roster fetch doesn't scale past a few hundred students anyway — so
  // this is server-side paged search (`/users/search`, teacher+; a blank
  // query with `role` set lists the whole role) rather than one big fetch
  // filtered/paged in memory. A plan filter is the one case with no matching
  // search+membership endpoint on the backend, so that path instead reads the
  // (already name-resolved) plan roster and filters/pages it client-side —
  // a plan's assignees are a small, bounded list on their own.
  const [studentsPage, { refetch: refetchStudents }] = createResource(
    () => ({ plan: planFilter(), q: debouncedQuery(), page: studentPage(), size: studentPageSize() }),
    async ({ plan, q, page, size }): Promise<{ items: PersonRef[]; total: number }> => {
      if (plan) {
        const assignments = await getPlanAssignments(plan, { limit: 500 });
        const all = assignments.items
          .map((row) => row.student)
          .filter((user) => matchesSearch(q, personLabel(user), user.username));
        const start = page * size;
        return { items: all.slice(start, start + size), total: all.length };
      }
      return getUserSearch(q, undefined, "student", { limit: size, offset: page * size });
    },
  );
  const pagedStudents = () => studentsPage()?.items ?? [];
  const studentsTotal = () => studentsPage()?.total ?? 0;

  const [routeProfile] = createResource(
    () => {
      const routeId = routeStudentId();
      if (!routeId || studentsPage.loading) return null;
      return pagedStudents().some((user) => user.id === routeId) ? null : routeId;
    },
    (userId) => getUserProfile(userId).catch(() => null),
  );

  createEffect(() => {
    const routeId = routeStudentId();
    if (!routeId) {
      setSelectedStudent(null);
      return;
    }
    const match = pagedStudents().find((user) => user.id === routeId);
    if (match) {
      setSelectedStudent(match);
      return;
    }
    // A direct visit/refresh on /management/payments/$userId whose student
    // isn't on the currently loaded page. The statement/balance/ledger reads
    // below only need the id; the header name comes from the public profile
    // (readable by any staff account) once it resolves.
    const named = routeProfile.latest;
    if (named && named.id === routeId) {
      setSelectedStudent({ id: named.id, username: named.username, display_name: named.display_name });
      return;
    }
    setSelectedStudent((prev) => (prev?.id === routeId ? prev : { id: routeId, username: routeId, display_name: null }));
  });

  // The backend has no bulk balance endpoint. Fetch only the visible page so
  // status/balance never disappear on schools with more than 200 students.
  const [paymentStudentRows] = createResource(
    () => {
      const users = pagedStudents();
      return users.length > 0 ? users : null;
    },
    async (users): Promise<PaymentStudentRow[]> =>
      mapConcurrent(users, FAN_OUT_LIMIT, async (user) => {
        try {
          return { ...user, balance_minor: (await getPaymentBalanceByUserId(user.id)).balance_minor };
        } catch {
          return { ...user, balance_minor: null };
        }
      }),
  );

  const studentColumns = createMemo<ColumnDef<PaymentStudentRow>[]>(() => [
    {
      id: "name",
      header: t("payments.student"),
      meta: { cellClass: "truncate" },
      cell: (cell) => <span class="block truncate font-medium">{personLabel(cell.row.original)}</span>,
    },
    {
      accessorKey: "username",
      header: t("payments.username"),
      cell: (cell) => <span class="text-sm text-muted-foreground">@{cell.row.original.username}</span>,
    },
    {
      id: "debt",
      header: t("payments.status"),
      accessorFn: (user) => user.balance_minor ?? 0,
      cell: (cell) => {
        const bal = cell.row.original.balance_minor;
        if (bal == null) return <span class="text-sm text-muted-foreground">—</span>;
        const inDebt = bal < 0;
        return (
          <Badge variant="outline" class={inDebt ? "border-destructive/50 bg-destructive/10 text-destructive-text" : "border-success/50 bg-success/10 text-success-text"}>
            <span class={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${inDebt ? "bg-destructive" : "bg-success"}`} />
            {inDebt ? t("payments.inDebt") : t("payments.settled")}
          </Badge>
        );
      },
    },
    {
      id: "balance",
      header: t("payments.balance"),
      accessorFn: (user) => user.balance_minor ?? 0,
      cell: (cell) => {
        const bal = cell.row.original.balance_minor;
        return <span class="font-medium tabular-nums" classList={{ "text-destructive-text": (bal ?? 0) < 0 }}>{bal == null ? "—" : formatTry(bal, moneyLocale())}</span>;
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
            onSelect: () => navigate({ to: "/management/payments/$userId", params: { userId: cell.row.original.id } }),
          }]}
        />
      ),
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
  // Figma's Tümü/Gecikmiş/Bu ay/Kapanmış tabs, rebuilt over the statement rows
  // already fetched for the selected student — `overdue` is the backend's own
  // rollup field, "closed" reuses the same paid/reversed check as the status
  // badge below, and "this month" groups by the due date's calendar month.
  // This is per-student, not the school-wide period totals Figma shows next
  // to it — those would need a bulk statement read across every student with
  // an assumed billing period, which no endpoint provides (see report).
  const [entryTab, setEntryTab] = createSignal("all");
  const now = new Date();
  const isThisMonth = (ms: number | null) => {
    if (ms == null) return false;
    const d = new Date(ms);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const tabFilteredEntries = createMemo(() => {
    const rows = sortedEntries();
    switch (entryTab()) {
      case "overdue":
        return rows.filter((row) => row.overdue);
      case "month":
        return rows.filter((row) => isThisMonth(row.due_at));
      case "closed":
        return rows.filter((row) => !row.reversed && row.outstanding_minor <= 0);
      default:
        return rows;
    }
  });
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
  const [viewEntry, setViewEntry] = createSignal<StatementEntry | null>(null);
  const [collectAmount, setCollectAmount] = createSignal("");
  const [collectMethod, setCollectMethod] = createSignal("");
  const [collectCustomMethod, setCollectCustomMethod] = createSignal("");
  const [collectNote, setCollectNote] = createSignal("");

  const openCollect = (entry: StatementEntry) => {
    setCollectEntry(entry);
    setCollectAmount(entry.outstanding_minor > 0 ? String(entry.outstanding_minor / 100) : "");
    setCollectMethod(t("payments.methodCash"));
    setCollectCustomMethod("");
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
    const method = collectMethod() === CUSTOM_PAYMENT_METHOD ? collectCustomMethod().trim() : collectMethod().trim();
    if (collectMethod() === CUSTOM_PAYMENT_METHOD && !method) {
      setError(t("payments.methodRequired"));
      return;
    }
    setPending(true);
    setError("");
    try {
      await postPaymentCredit({
        charge_id: entry.charge_id,
        amount_minor,
        method: method || undefined,
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
      size: 260,
      meta: { cellClass: "truncate" },
      cell: (cell) => <span class="block truncate font-medium">{cell.row.original.plan_name ?? "—"}</span>,
    },
    {
      accessorKey: "due_at",
      header: t("payments.due"),
      size: 120,
      cell: (cell) => <span class="whitespace-nowrap text-sm" classList={{ "font-semibold text-destructive-text": cell.row.original.overdue }}>{cell.row.original.due_at == null ? "—" : formatDate(cell.row.original.due_at, locale())}</span>,
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
      header: t("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setViewEntry(cell.row.original) },
            ...(!cell.row.original.reversed && cell.row.original.outstanding_minor > 0
              ? [{ label: t("payments.collect"), icon: <IconPlus class="h-4 w-4" />, onSelect: () => openCollect(cell.row.original) }]
              : []),
          ]}
        />
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
  const [viewPlan, setViewPlan] = createSignal<FeePlan | null>(null);
  const [assignStudent, setAssignStudent] = createSignal("");
  const [assignCandidate, setAssignCandidate] = createSignal<PersonRef | null>(null);
  const [assignStudents, setAssignStudents] = createSignal<PersonRef[]>([]);
  const [assignments, { refetch: refetchAssignments }] = createResource(
    () => assignPlan()?.id ?? viewPlan()?.id ?? null,
    (planId) => getPlanAssignments(planId, { limit: 200 }),
  );

  const planTotal = (plan: FeePlan) => plan.installments.reduce((sum, item) => sum + item.amount_minor, 0);
  const planColumns = createMemo<ColumnDef<FeePlan>[]>(() => [
    { accessorKey: "name", header: t("payments.planName"), cell: (cell) => <span class="font-medium">{cell.row.original.name}</span> },
    { id: "installments", header: t("payments.installments"), cell: (cell) => <span class="text-sm">{cell.row.original.installments.length}</span> },
    { id: "total", header: t("payments.total"), cell: (cell) => <span class="tabular-nums">{formatTry(planTotal(cell.row.original), moneyLocale())}</span> },
    {
      id: "actions",
      header: t("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <div class="flex items-center justify-center gap-1">
          <Button size="sm" variant="outline" class="h-8 gap-1 rounded-lg px-2 text-xs" onClick={() => openAssign(cell.row.original)}>
            <IconPlus class="h-4 w-4" />
            {t("payments.assign")}
          </Button>
          <TableRowActions
            label={t("common.actions")}
            compact
            actions={[
              { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setViewPlan(cell.row.original) },
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
    setAssignCandidate(null);
    setAssignStudents([]);
    setError("");
  };
  const addAssignStudent = () => {
    const candidate = assignCandidate();
    if (!candidate || assignStudents().length >= MAX_PLAN_ASSIGNMENT_STUDENTS || assignStudents().some((student) => student.id === candidate.id)) return;
    setAssignStudents([...assignStudents(), candidate]);
    setAssignStudent("");
    setAssignCandidate(null);
  };
  const removeAssignStudent = (id: string) => setAssignStudents(assignStudents().filter((student) => student.id !== id));
  const submitAssign = async () => {
    const plan = assignPlan();
    const students = assignStudents();
    if (!plan || students.length === 0) return;
    setPending(true);
    setError("");
    try {
      const outcomes = await postPlanAssignment(plan.id, { student_ids: students.map((student) => student.id) });
      const assigned = outcomes.filter((outcome) => outcome.status === "assigned").length;
      const alreadyAssigned = outcomes.filter((outcome) => outcome.status === "already_assigned").length;
      const rejected = outcomes.length - assigned - alreadyAssigned;
      setFlash(t("payments.assignmentSummary", { assigned, alreadyAssigned, rejected }));
      setAssignStudents([]);
      setAssignStudent("");
      setAssignCandidate(null);
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
              <>
              {/* No endpoint totals billed / collected / overdue across the
                  school, so the design's period KPI cards are left out. */}
              <section class="space-y-4 p-0">
              <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
                <Show when={studentsPage.error}>
                  <ErrorAlert message={formatApiError(studentsPage.error)} onRetry={() => void refetchStudents()} />
                </Show>
                <DataTable
                    columns={studentColumns()}
                    data={paymentStudentRows() ?? []}
                    onRowClick={(user) => navigate({ to: "/management/payments/$userId", params: { userId: user.id } })}
                    searchValue={studentQuery()}
                    onSearchInput={(value) => {
                      setStudentQuery(value);
                      setStudentPage(0);
                    }}
                    filterPlaceholder={t("payments.searchStudents")}
                    filterHint={t("search.hint.paymentsStudents")}
                    title={t("payments.title")}
                    description={t("payments.subtitle")}
                    empty={t("form.noStudents")}
                    filters={
                      <Select value={planFilter()} onChange={(e) => { setPlanFilter(e.currentTarget.value); setStudentPage(0); }} wrapperClass="w-56">
                        <option value="">{t("payments.allPlans")}</option>
                        <For each={planList()}>{(plan) => <option value={plan.id}>{plan.name}</option>}</For>
                      </Select>
                    }
                    tableClass="min-w-160"
                    storageKey="payment-students"
                    enableSorting
                    enablePagination
                    manualPagination={{
                      pageIndex: studentPage(),
                      pageSize: studentPageSize(),
                      total: studentsTotal(),
                      onPageChange: setStudentPage,
                    }}
                  />
              </Suspense>
              </section>
              </>
            }
          >
            {(current) => (<>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">{personLabel(current())}</h2>
                <p class="text-sm text-muted-foreground">@{current().username}</p>
              </div>
              <Button variant="outline" size="sm" class="rounded-lg" onClick={() => navigate({ to: "/management/payments" })}>
                <IconChevronLeft class="h-4 w-4" />{t("payments.allStudents")}
              </Button>
            </div>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="detail-metric-card"><p class="text-xs font-medium text-text-subtle">{t("payments.totalDebt")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().billed, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs font-medium text-text-subtle">{t("payments.collected")}</p><p class="mt-1 font-semibold tabular-nums">{formatTry(summary().collected, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs font-medium text-text-subtle">{t("payments.balance")}</p><p class="mt-1 font-semibold tabular-nums" classList={{ "text-destructive-text": summary().balance < 0 }}>{formatTry(summary().balance, moneyLocale())}</p></div>
              <div class="detail-metric-card"><p class="text-xs font-medium text-text-subtle">{t("payments.overdueCount")}</p><p class="mt-1 font-semibold tabular-nums" classList={{ "text-destructive-text": summary().overdue > 0 }}>{summary().overdue}</p></div>
            </div>

            <section class="space-y-4 p-0">
              <Suspense fallback={<DataTableSkeleton columns={5} rows={5} />}>
                <Show when={statement.error}>
                  <ErrorAlert message={formatApiError(statement.error)} onRetry={() => void refetchStatement()} />
                </Show>
                <Show
                  when={entries().length > 0}
                  fallback={
                    <div class="space-y-3">
                      <EmptyState kind="payments" title={t("payments.noDebt")} description={t("payments.noDebtHint")} />
                      <div class="flex justify-center">
                        <Button variant="outline" size="sm" class="rounded-lg" onClick={() => setTab("plans")}>{t("payments.tabPlans")}</Button>
                      </div>
                    </div>
                  }
                >
                  <div class="space-y-3">
                    <Tabs value={entryTab()} onChange={setEntryTab}>
                      <TabsList>
                        <TabsTrigger value="all">{t("payments.entryTabAll")}</TabsTrigger>
                        <TabsTrigger value="overdue">{t("payments.entryTabOverdue")}</TabsTrigger>
                        <TabsTrigger value="month">{t("payments.entryTabMonth")}</TabsTrigger>
                        <TabsTrigger value="closed">{t("payments.entryTabClosed")}</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <DataTable
                      columns={statementColumns()}
                      data={tabFilteredEntries()}
                      tableClass="min-w-160"
                      storageKey="payment-statement"
                      enablePagination
                      pageSize={STATEMENT_PAGE_SIZE}
                      onRowClick={setViewEntry}
                    />
                  </div>
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
                              <Button size="sm" variant="ghost" class="text-destructive-text" onClick={() => openLineAction(line, "reverse")}>{t("payments.reverse")}</Button>
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
          <section class="space-y-4 p-0">
            <Suspense fallback={<DataTableSkeleton columns={4} rows={6} />}>
              <Show when={plans.error}>
                <ErrorAlert message={formatApiError(plans.error)} onRetry={() => void refetchPlans()} />
              </Show>
              <DataTable
                title={t("payments.tabPlans")}
                description={t("payments.subtitle")}
                actions={
                  <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={openCreate}>
                    <IconPlus class="h-4 w-4" />
                    {t("payments.createPlan")}
                  </Button>
                }
                empty={t("payments.empty")}
                columns={planColumns()}
                data={planList()}
                onRowClick={setViewPlan}
                storageKey="payment-plans"
                tableClass="min-w-160"
                filterColumn="name"
                enablePagination
                pageSize={PLAN_PAGE_SIZE}
              />
            </Suspense>
          </section>
        </TabsContent>
      </Tabs>

      <SidePanel
        open={viewEntry() != null}
        onOpenChange={(open) => { if (!open) setViewEntry(null); }}
        title={viewEntry()?.plan_name ?? t("payments.plan")}
        description={viewEntry()?.due_at == null ? "—" : formatDate(viewEntry()!.due_at, locale())}
      >
        <Show when={viewEntry()} keyed>
          {(entry) => (
            <div class="space-y-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("payments.amountTry")} value={formatTry(entry.amount_minor, moneyLocale())} />
                <DetailField label={t("payments.credited")} value={formatTry(entry.credited_minor, moneyLocale())} />
                <DetailField label={t("payments.outstanding")} value={formatTry(entry.outstanding_minor, moneyLocale())} />
                <DetailField label={t("payments.reversed")} value={entry.reversed ? t("payments.reversed") : "—"} />
                <DetailField label={t("payments.plan")} value={entry.plan ?? "—"} />
                <DetailField label={t("admin.id")} value={entry.charge_id} mono />
              </div>
              <Show when={!entry.reversed && entry.outstanding_minor > 0}>
                <Button onClick={() => { setViewEntry(null); openCollect(entry); }}>{t("payments.collect")}</Button>
              </Show>
            </div>
          )}
        </Show>
      </SidePanel>

      <SidePanel
        open={viewPlan() != null}
        onOpenChange={(open) => { if (!open) setViewPlan(null); }}
        title={viewPlan()?.name ?? t("payments.plan")}
        description={viewPlan() ? formatDate(viewPlan()!.created_at, locale()) : ""}
        size="wide"
      >
        <Show when={viewPlan()} keyed>
          {(plan) => (
            <div class="space-y-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <DetailField label={t("payments.total")} value={formatTry(planTotal(plan), moneyLocale())} />
                <DetailField label={t("payments.installments")} value={String(plan.installments.length)} />
                <DetailField label={t("bank.owner")} value={personLabel(plan.created_by)} />
                <DetailField label={t("bank.created")} value={formatDate(plan.created_at, locale())} />
              </div>
              <div class="space-y-2">
                <Label>{t("payments.installments")}</Label>
                <For each={plan.installments}>
                  {(installment) => (
                    <div class="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm">
                      <span>{formatDate(installment.due_at, locale())}</span>
                      <span class="font-semibold tabular-nums">{formatTry(installment.amount_minor, moneyLocale())}</span>
                    </div>
                  )}
                </For>
              </div>
              <div class="space-y-2">
                <Label>{t("payments.assignments")}</Label>
                <For each={assignments()?.items ?? []}>
                  {(row) => <div class="rounded-lg border bg-card px-3 py-2.5 text-sm">{personLabel(row.student)}</div>}
                </For>
                <Show when={(assignments()?.items.length ?? 0) === 0}>
                  <p class="text-sm text-muted-foreground">{t("payments.noAssignments")}</p>
                </Show>
              </div>
              <div class="flex gap-2">
                <Button variant="outline" onClick={() => { setViewPlan(null); startEdit(plan); }}>{t("common.edit")}</Button>
                <Button onClick={() => { setViewPlan(null); openAssign(plan); }}>{t("payments.assign")}</Button>
              </div>
            </div>
          )}
        </Show>
      </SidePanel>

      {/* ---------------- Collect payment panel ---------------- */}
      <SidePanel guardUnsaved
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
              <option value={CUSTOM_PAYMENT_METHOD}>{t("payments.methodOther")}</option>
            </Select>
          </div>
          <Show when={collectMethod() === CUSTOM_PAYMENT_METHOD}>
            <div class="space-y-1.5">
              <Label for="collect-custom-method">{t("payments.methodOther")}</Label>
              <Input id="collect-custom-method" maxlength={50} required value={collectCustomMethod()} onInput={(e) => setCollectCustomMethod(e.currentTarget.value)} />
            </div>
          </Show>
          <div class="space-y-1.5">
            <Label for="collect-note">{t("payments.note")}</Label>
            <Textarea id="collect-note" maxlength={500} value={collectNote()} onInput={(e) => setCollectNote(e.currentTarget.value)} />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setCollectEntry(null)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending()}>{t("payments.collect")}</Button>
          </div>
        </form>
      </SidePanel>

      {/* ---------------- Correction panel (refund / reverse) ---------------- */}
      <SidePanel guardUnsaved
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
            <Button type="button" variant="outline" onClick={() => setLineAction(null)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending()}>{t("common.save")}</Button>
          </div>
        </form>
      </SidePanel>

      {/* ---------------- Plan create / edit ---------------- */}
      <SidePanel guardUnsaved open={panelOpen()} onOpenChange={(open) => { setPanelOpen(open); if (!open) resetPlanForm(); }} title={editing() ? t("payments.editPlan") : t("payments.createPlan")} description={t("payments.subtitle")}>
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
                    <Button type="button" variant="ghost" size="sm" class="text-destructive-text" onClick={() => removeRow(idx)} aria-label={t("common.delete")}>
                      <IconTrash class="h-4 w-4" />
                    </Button>
                  </Show>
                </div>
              )}
            </Index>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={pending()}>{editing() ? t("common.update") : t("common.create")}</Button>
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
              <UserSearchSelect id="assign-student" role="student" value={assignStudent()} onChange={setAssignStudent} onSelect={setAssignCandidate} excludeIds={assignStudents().map((student) => student.id)} label={t("payments.selectStudent")} placeholder={t("payments.selectStudent")} />
            </div>
            <Button type="button" variant="outline" disabled={!assignCandidate() || assignStudents().length >= MAX_PLAN_ASSIGNMENT_STUDENTS || pending()} onClick={addAssignStudent}>{t("payments.addStudent")}</Button>
          </div>
          <Show when={assignStudents().length > 0}>
            <div class="space-y-2">
              <Label>{t("payments.selectedStudents", { count: assignStudents().length })}</Label>
              <div class="flex flex-wrap gap-2">
                <For each={assignStudents()}>
                  {(student) => <Badge variant="secondary" class="gap-1.5 py-1 pr-1">{personLabel(student)}<Button type="button" variant="ghost" size="sm" class="h-5 w-5 rounded-md p-0" onClick={() => removeAssignStudent(student.id)} aria-label={t("common.remove")}><IconTrash class="h-3.5 w-3.5" /></Button></Badge>}
                </For>
              </div>
              <Button disabled={pending()} onClick={() => void submitAssign()}>{t("payments.assignSelected")}</Button>
            </div>
          </Show>
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
