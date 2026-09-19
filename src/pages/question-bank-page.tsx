import { useNavigate } from "@tanstack/solid-router";
import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteBankQuestionById, getBankQuestions } from "@/api/bank-questions";
import { getCourses } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { BankQuestion } from "@/api/client";
import { BankQuestionForm } from "@/components/exams/bank-question-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEye, IconEyeOff, IconPlus, IconTrash, IconUsers } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createDebouncedSignal } from "@/lib/create-debounced-signal";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

const BANK_PAGE_SIZE = 10;

export default function QuestionBankPage() {
  return (
    <RouteGuard minRole="teacher">
      <QuestionBankContent />
    </RouteGuard>
  );
}

function QuestionBankContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [bankTab, setBankTab] = createSignal<"all" | "mine" | "school">("all");
  const ownerFilter = () => (bankTab() === "mine" ? "me" : "all") as "all" | "me";
  const visibilityFilter = () => (bankTab() === "school" ? "school" : "all") as "all" | "private" | "school";
  const [subjectFilter, setSubjectFilter] = createSignal("all");
  const [page, setPage] = createSignal(0);
  const [query, setQuery, debouncedQuery] = createDebouncedSignal();
  const [createOpen, setCreateOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<BankQuestion | null>(null);
  const [removing, setRemoving] = createSignal<BankQuestion | null>(null);
  // ponytail: the subject dropdown lists the subjects seen while browsing — the
  // backend has no "all subjects" endpoint. Widen once one exists.
  const [subjectNames, setSubjectNames] = createSignal<Record<string, string>>({});
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");

  const [list, { refetch }] = createResource(
    () => ({
      page: page(),
      owner: ownerFilter(),
      subject: subjectFilter(),
      visibility: visibilityFilter(),
      q: debouncedQuery().trim(),
    }),
    async (filters) => {
      const result = await getBankQuestions({
        limit: BANK_PAGE_SIZE,
        offset: filters.page * BANK_PAGE_SIZE,
        ...(filters.owner === "me" ? { owner: "me" } : {}),
        ...(filters.subject !== "all" ? { subject: filters.subject } : {}),
        ...(filters.visibility !== "all" ? { visibility: filters.visibility } : {}),
        ...(filters.q ? { q: filters.q } : {}),
      });
      setSubjectNames((current) => {
        const next = { ...current };
        for (const item of result.items) if (item.subject) next[item.subject] = item.subject_name;
        return next;
      });
      return result;
    },
  );
  const total = () => list.latest?.total ?? 0;
  // Deleting the last row of the last page shrinks the page count under the
  // current page; the table then hides its pagination bar entirely and the user
  // is stranded with no control to get back. Same clamp as exam-questions-panel.
  const pageCount = () => Math.max(1, Math.ceil(total() / BANK_PAGE_SIZE));
  createEffect(() => {
    if (page() >= pageCount()) setPage(pageCount() - 1);
  });

  // Only courses the teacher can author in supply subjects for a new template.
  const [courses] = createResource(async () => (await getCourses({ limit: 100 })).items);
  const manageableCourses = createMemo(() =>
    (courses() ?? []).filter((course) => {
      const user = auth.user();
      if (!user) return false;
      return (
        course.creator.id === user.id ||
        hasMinRole(user.role, "manager")
      );
    }),
  );

  const canEdit = (question: BankQuestion) =>
    question.owner === auth.user()?.id || hasMinRole(auth.user()?.role, "admin");

  const columns = createMemo<ColumnDef<BankQuestion>[]>(() => [
    {
      accessorKey: "text",
      header: t("questions.text"),
      cell: (cell) => (
        <div class="min-w-0">
          <p class="max-w-[30rem] truncate font-medium">{cell.row.original.text}</p>
          <p class="truncate text-xs text-muted-foreground">{cell.row.original.subject_name || "—"}</p>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: t("questions.kind"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => (
        <Badge variant="outline">
          {cell.row.original.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
        </Badge>
      ),
    },
    {
      accessorKey: "points",
      header: t("questions.points"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
    },
    {
      accessorKey: "used_count",
      header: t("bank.usedCount"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
    },
    {
      id: "visibility",
      accessorFn: (question) => question.visibility,
      header: t("bank.whoCanSee"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => (
        <Show
          when={cell.row.original.visibility === "school"}
          fallback={
            <Badge variant="secondary" class="gap-1 whitespace-nowrap">
              <IconEyeOff class="h-3 w-3" />
              {t("bank.onlyMe")}
            </Badge>
          }
        >
          <Badge variant="outline" class="gap-1 whitespace-nowrap border-success/50 bg-success/10 text-success-text">
            <IconUsers class="h-3 w-3" />
            {t("bank.sharedWithSchool")}
          </Badge>
        </Show>
      ),
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
              {
                label: t("common.view"),
                icon: <IconEye class="h-4 w-4" />,
                onSelect: () => navigate({ to: "/question-bank/$id", params: { id: cell.row.original.id } }),
              },
              ...(canEdit(cell.row.original) ? [
              {
                label: t("common.edit"),
                icon: <IconEdit class="h-4 w-4" />,
                onSelect: () => setEditing(cell.row.original),
              },
              {
                label: t("common.delete"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () => setRemoving(cell.row.original),
              },
              ] : []),
            ]}
        />
      ),
    },
  ]);

  const subjectOptions = createMemo(() => [
    { value: "all", label: t("common.all") },
    ...Object.entries(subjectNames()).map(([id, name]) => ({ value: id, label: name })),
  ]);

  return (
    <div class="space-y-6">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Tabs
        value={bankTab()}
        onChange={(value) => {
          setBankTab(value as "all" | "mine" | "school");
          setPage(0);
        }}
      >
        <TabsList aria-label={t("bank.title")}>
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="mine">{t("bank.mine")}</TabsTrigger>
          <TabsTrigger value="school">{t("bank.sharedWithSchool")}</TabsTrigger>
        </TabsList>

        <TabsContent value={bankTab()} class="mt-4 border-0 bg-transparent p-0 shadow-none">
          <section class="space-y-4 p-0">
            <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
              <Show when={list.error}>
                <Alert variant="destructive">{formatApiError(list.error)}</Alert>
              </Show>
              <DataTable
                title={t("bank.title")}
                description={`${t("bank.subtitle")} ${t("bank.countTotal", { total: total() })}`}
                actions={
                  <Show when={manageableCourses().length > 0}>
                    <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("bank.create")}
                    </Button>
                  </Show>
                }
                columns={columns()}
                data={list()?.items ?? []}
                tableClass="min-w-[40rem]"
                filterPlaceholder={t("bank.search")}
                filterHint={t("search.hint.bank")}
                searchValue={query()}
                onSearchInput={(value) => {
                  setQuery(value);
                  setPage(0);
                }}
                enablePagination
                manualPagination={{ pageIndex: page(), pageSize: BANK_PAGE_SIZE, total: total(), onPageChange: setPage }}
                empty={t("bank.empty")}
                storageKey="question-bank"
                onRowClick={(question) => navigate({ to: "/question-bank/$id", params: { id: question.id } })}
                filters={
                  <div class="flex flex-wrap items-center gap-2.5">
                    <DropdownSelect
                      labelPrefix={t("subjects.subject")}
                      value={subjectFilter()}
                      onChange={(value) => {
                        setSubjectFilter(value);
                        setPage(0);
                      }}
                      options={subjectOptions()}
                    />
                    <DropdownSelect
                      labelPrefix={t("bank.source")}
                      value="all"
                      disabled
                      onChange={() => {}}
                      options={[
                        { value: "all", label: t("common.all") },
                        { value: "institution", label: t("bank.source.institution") },
                        { value: "publisher", label: t("bank.source.publisher") },
                        { value: "ai", label: t("bank.source.ai") },
                      ]}
                    />
                    <ComingSoonBadge />
                  </div>
                }
              />
            </Suspense>
          </section>
        </TabsContent>
      </Tabs>

      <SidePanel guardUnsaved
        open={createOpen() || editing() != null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        title={editing() ? t("bank.edit") : t("bank.create")}
        description={t("bank.title")}
        size="wide"
      >
        <BankQuestionForm
          initial={editing() ?? undefined}
          courses={manageableCourses()}
          onSaved={async () => {
            const wasEdit = editing() != null;
            setCreateOpen(false);
            setEditing(null);
            setError("");
            setFlash(wasEdit ? t("common.saved") : t("common.created"));
            await refetch();
          }}
          onCancel={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      </SidePanel>

      <ConfirmDialog
        open={removing() != null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={removing()?.text ?? ""}
        onConfirm={async () => {
          const question = removing();
          if (!question) return;
          setError("");
          try {
            await deleteBankQuestionById(question.id);
            await refetch();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setRemoving(null);
          }
        }}
      />
    </div>
  );
}
