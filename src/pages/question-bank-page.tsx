import { Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEyeOff, IconPlus, IconTrash, IconUsers } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createDebouncedSignal } from "@/lib/create-debounced-signal";
import { createFlash } from "@/lib/flash";
import { formatDate } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const BANK_PAGE_SIZE = 12;

export default function QuestionBankPage() {
  return (
    <RouteGuard minRole="teacher">
      <QuestionBankContent />
    </RouteGuard>
  );
}

function QuestionBankContent() {
  const auth = useAuth();
  const t = useT();
  const { locale } = usePreferences();
  createEffect(() => {
    document.title = `${t("nav.questionBank")} · Hezarfen`;
  });
  const [ownerFilter, setOwnerFilter] = createSignal<"all" | "me">("all");
  const [subjectFilter, setSubjectFilter] = createSignal("all");
  const [visibilityFilter, setVisibilityFilter] = createSignal<"all" | "private" | "school">("all");
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
        (course.teachers ?? []).some((teacher) => teacher.id === user.id) ||
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
      cell: (cell) => <p class="truncate font-medium">{cell.row.original.text}</p>,
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
      meta: { headerClass: "text-center", cellClass: "mono text-center" },
    },
    {
      id: "subject",
      accessorFn: (question) => question.subject_name,
      header: t("subjects.subject"),
      meta: { cellClass: "truncate text-muted-foreground" },
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
          <Badge variant="outline" class="gap-1 whitespace-nowrap border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <IconUsers class="h-3 w-3" />
            {t("bank.sharedWithSchool")}
          </Badge>
        </Show>
      ),
    },
    {
      id: "owner",
      accessorFn: (question) => question.owner_name,
      header: t("bank.owner"),
      meta: { cellClass: "truncate text-muted-foreground" },
    },
    {
      id: "used",
      accessorFn: (question) => question.used_count,
      header: t("bank.usedInExams"),
      meta: { headerClass: "text-center", cellClass: "mono text-center text-muted-foreground" },
      // A template nobody copied stays blank: "0" is noise on a page where
      // most rows are fresh.
      cell: (cell) => <Show when={cell.row.original.used_count > 0}>{cell.row.original.used_count}</Show>,
    },
    {
      accessorKey: "created_at",
      header: t("bank.created"),
      meta: { cellClass: "mono whitespace-nowrap text-muted-foreground" },
      cell: (cell) => formatDate(cell.row.original.created_at, locale()),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-28 min-w-[7rem] text-center whitespace-nowrap", cellClass: "w-28 min-w-[7rem] text-center whitespace-nowrap" },
      cell: (cell) => (
        <Show when={canEdit(cell.row.original)}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
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
            ]}
          />
        </Show>
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

      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
        <Suspense fallback={<DataTableSkeleton columns={9} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <DataTable
            title={t("bank.title")}
            description={`${t("bank.subtitle")} ${t("bank.countTotal", { total: total() })}`}
            actions={
              <Show when={manageableCourses().length > 0}>
                <Button type="button" size="sm" class="min-w-30 rounded-lg" onClick={() => setCreateOpen(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("bank.create")}
                </Button>
              </Show>
            }
            columns={columns()}
            data={list()?.items ?? []}
            tableClass="table-fixed min-w-6xl"
            filterPlaceholder={t("bank.search")}
            searchValue={query()}
            onSearchInput={(value) => {
              setQuery(value);
              setPage(0);
            }}
            enablePagination
            manualPagination={{ pageIndex: page(), pageSize: BANK_PAGE_SIZE, total: total(), onPageChange: setPage }}
            empty={t("bank.empty")}
            filters={
              <div class="flex flex-wrap items-center gap-2.5">
                <DropdownSelect
                  labelPrefix={t("bank.owner")}
                  value={ownerFilter()}
                  onChange={(value) => {
                    setOwnerFilter(value as "all" | "me");
                    setPage(0);
                  }}
                  options={[
                    { value: "all", label: t("common.all") },
                    { value: "me", label: t("bank.mine") },
                  ]}
                />
                <DropdownSelect
                  labelPrefix={t("bank.whoCanSee")}
                  value={visibilityFilter()}
                  onChange={(value) => {
                    setVisibilityFilter(value as "all" | "private" | "school");
                    setPage(0);
                  }}
                  options={[
                    { value: "all", label: t("common.all") },
                    { value: "private", label: t("bank.onlyMe") },
                    { value: "school", label: t("bank.sharedWithSchool") },
                  ]}
                />
                <DropdownSelect
                  labelPrefix={t("subjects.subject")}
                  value={subjectFilter()}
                  onChange={(value) => {
                    setSubjectFilter(value);
                    setPage(0);
                  }}
                  options={subjectOptions()}
                />
              </div>
            }
          />
        </Suspense>
      </section>

      <SidePanel
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
