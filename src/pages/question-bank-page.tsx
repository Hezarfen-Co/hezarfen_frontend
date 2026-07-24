import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteBankQuestionById, getBankQuestions } from "@/api/bank-questions";
import { getCourses } from "@/api/courses";
import { getSubjectById } from "@/api/subjects";
import { getUserById } from "@/api/users";
import { formatApiError } from "@/api/client";
import type { BankQuestion } from "@/api/client";
import { BankQuestionForm } from "@/components/exams/bank-question-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
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
  const [ownerFilter, setOwnerFilter] = createSignal<"all" | "me">("all");
  const [subjectFilter, setSubjectFilter] = createSignal("all");
  const [createOpen, setCreateOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<BankQuestion | null>(null);
  const [removing, setRemoving] = createSignal<BankQuestion | null>(null);
  const [subjectNames, setSubjectNames] = createSignal<Record<string, string>>({});
  const [ownerNames, setOwnerNames] = createSignal<Record<string, string>>({});
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");

  // ponytail: first 100 templates per filter — matches how the other list pages
  // page client-side. Move to `manualPagination` once a school outgrows it.
  const [list, { refetch }] = createResource(
    () => ({ owner: ownerFilter(), subject: subjectFilter() }),
    async (filters) => {
      const items = (
        await getBankQuestions({
          limit: 100,
          ...(filters.owner === "me" ? { owner: "me" } : {}),
          ...(filters.subject !== "all" ? { subject: filters.subject } : {}),
        })
      ).items;
      const subjects = [...new Set(items.map((item) => item.subject))].filter((id) => !subjectNames()[id]);
      const owners = [...new Set(items.map((item) => item.owner))].filter((id) => !ownerNames()[id]);
      await Promise.all([
        ...subjects.map((id) =>
          getSubjectById(id)
            .then((subject) => setSubjectNames((current) => ({ ...current, [id]: subject.name })))
            .catch(() => {}),
        ),
        ...owners.map((id) =>
          getUserById(id)
            .then((user) =>
              setOwnerNames((current) => ({
                ...current,
                [id]: [user.name, user.surname].filter(Boolean).join(" ") || user.username,
              })),
            )
            .catch(() => {}),
        ),
      ]);
      return items;
    },
  );

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

  const subjectName = (id: string) => subjectNames()[id] ?? id;
  const ownerName = (id: string) => ownerNames()[id] ?? id;
  const canEdit = (question: BankQuestion) =>
    question.owner === auth.user()?.id || hasMinRole(auth.user()?.role, "admin");

  const searchTemplate = (question: BankQuestion, query: string) =>
    [question.text, subjectName(question.subject), ownerName(question.owner)]
      .join(" ")
      .toLocaleLowerCase(locale())
      .includes(query.toLocaleLowerCase(locale()));

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
      accessorFn: (question) => subjectName(question.subject),
      header: t("subjects.subject"),
      meta: { cellClass: "truncate text-muted-foreground" },
    },
    {
      id: "owner",
      accessorFn: (question) => ownerName(question.owner),
      header: t("bank.owner"),
      meta: { cellClass: "truncate text-muted-foreground" },
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
        <Suspense fallback={<DataTableSkeleton columns={7} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <DataTable
            title={t("bank.title")}
            description={t("bank.subtitle")}
            actions={
              <Show when={manageableCourses().length > 0}>
                <Button type="button" size="sm" class="min-w-30 rounded-lg" onClick={() => setCreateOpen(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("bank.create")}
                </Button>
              </Show>
            }
            columns={columns()}
            data={list() ?? []}
            tableClass="table-fixed min-w-5xl"
            filterPlaceholder={t("bank.search")}
            searchPredicate={searchTemplate}
            enablePagination
            pageSize={BANK_PAGE_SIZE}
            empty={t("bank.empty")}
            filters={
              <div class="flex flex-wrap items-center gap-2.5">
                <DropdownSelect
                  labelPrefix={t("bank.owner")}
                  value={ownerFilter()}
                  onChange={(value) => setOwnerFilter(value as "all" | "me")}
                  options={[
                    { value: "all", label: t("common.all") },
                    { value: "me", label: t("bank.mine") },
                  ]}
                />
                <DropdownSelect
                  labelPrefix={t("subjects.subject")}
                  value={subjectFilter()}
                  onChange={(value) => setSubjectFilter(value)}
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
          onSaved={async (_question, imagesLost) => {
            const wasEdit = editing() != null;
            setCreateOpen(false);
            setEditing(null);
            setError(imagesLost ?? "");
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
