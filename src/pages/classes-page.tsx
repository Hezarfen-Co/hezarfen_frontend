import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getClasses, postClass } from "@/api/classes";
import { getTerms } from "@/api/terms";
import { getLimits } from "@/api/limits";
import { formatApiError, type ClassGroup } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconChevronRight, IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ClassesPage() {
  return <RouteGuard><ClassesContent /></RouteGuard>;
}

function ClassesContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const canManage = () => hasMinRole(auth.user()?.role, "manager");

  const [showForm, setShowForm] = createSignal(false);
  const [name, setName] = createSignal("");
  const [grade, setGrade] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  const [list, { refetch }] = createResource(async () => (await getClasses()).items);
  const listData = () => list.latest ?? list();
  const termName = (id: string | null) => terms.latest?.find((term) => term.id === id)?.name ?? (id || t("terms.unassigned"));

  const columns = createMemo<ColumnDef<ClassGroup>[]>(() => [
    {
      id: "name",
      accessorFn: (row) => row.name,
      header: t("classGroups.className"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "grade",
      accessorFn: (row) => row.grade ?? "—",
      header: t("classGroups.grade"),
    },
    {
      id: "term",
      accessorFn: (row) => termName(row.term),
      header: t("terms.term"),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <Show when={canManage()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[{
              label: t("classGroups.open"),
              icon: <IconChevronRight class="h-4 w-4" />,
              onSelect: () => void navigate({ to: "/management/classes/$id", params: { id: cell.row.original.id } }),
            }]}
          />
        </Show>
      ),
    },
  ]);

  const createClass = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const created = await postClass({
        name: name().trim(),
        grade: grade().trim() || undefined,
        term_id: termId() || undefined,
      });
      setName(""); setGrade(""); setTermId(""); setShowForm(false);
      await refetch();
      setFlash(t("common.created"));
      void navigate({ to: "/management/classes/$id", params: { id: created.id } });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-5">
      <SidePanel open={canManage() && showForm()} onOpenChange={setShowForm} title={t("classGroups.newClass")} description={t("classGroups.subtitle")}>
        <form class="space-y-4" onSubmit={createClass}>
          <div class="space-y-3">
            <div class="space-y-1.5"><Label for="class-name">{t("classGroups.className")}<span class="ml-0.5 text-destructive">*</span></Label><Input id="class-name" required maxlength={limits.latest?.course.max_class_name_len} value={name()} onInput={(e) => setName(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="class-grade">{t("classGroups.grade")}</Label><Input id="class-grade" maxlength={limits.latest?.course.max_class_grade_len} value={grade()} onInput={(e) => setGrade(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="class-term">{t("terms.term")}</Label><Select id="class-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}><option value="">{t("terms.unassigned")}</option><For each={terms.latest ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For></Select></div>
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>

      <Suspense fallback={<DataTableSkeleton />}>
        <DataTable
          columns={columns()}
          data={listData() ?? []}
          filterColumn="name"
          enablePagination
          pageSize={10}
          title={t("classGroups.title")}
          description={t("classGroups.subtitle")}
          empty={t("classGroups.empty")}
          onRowClick={(row) => void navigate({ to: "/management/classes/$id", params: { id: row.id } })}
          actions={
            <Show when={canManage()}>
              <Button size="sm" class="min-w-30 rounded-lg" onClick={() => setShowForm(true)}>
                <IconPlus class="h-4 w-4" />
                {t("classGroups.newClass")}
              </Button>
            </Show>
          }
        />
      </Suspense>
    </div>
  );
}
