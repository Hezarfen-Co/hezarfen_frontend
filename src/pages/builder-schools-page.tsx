import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteSchool, getSchools, patchSchool } from "@/api/schools";
import { formatApiError, type School } from "@/api/client";
import { BuilderGuard } from "@/components/builder/builder-guard";
import { BuilderHeader } from "@/components/builder/builder-header";
import { CreateSchoolPanel } from "@/components/builder/create-school-panel";
import { SchoolAdminAccessPanel, type AdminAccessMode } from "@/components/builder/school-admin-access-panel";
import { SchoolEditPanel } from "@/components/builder/school-edit-panel";
import { SchoolStatusBadge } from "@/components/builder/school-status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconExternalLink, IconEye, IconLock, IconPlus, IconRotateCcw, IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { BuilderProvider } from "@/stores/builder-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const SCHOOL_PAGE_SIZE = 15;

export default function BuilderSchoolsPage() {
  return (
    <BuilderProvider>
      <BuilderGuard>
        <BuilderSchoolsContent />
      </BuilderGuard>
    </BuilderProvider>
  );
}

function BuilderSchoolsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const navigate = useNavigate();
  const [list, { refetch }] = createResource(async () => (await getSchools()).items);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<School | null>(null);
  const [editTarget, setEditTarget] = createSignal<School | null>(null);
  // The detail header's admin access (reset password / enter the school).
  const [access, setAccess] = createSignal<{ id: string; mode: AdminAccessMode } | null>(null);
  const auth = useAuth();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();

  const open = (school: School) => void navigate({ to: "/builder/schools/$id", params: { id: school.id } });

  const setStatus = async (school: School, status: School["status"]) => {
    setError("");
    try {
      await patchSchool(school.id, { status });
      await refetch();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const columns = createMemo<ColumnDef<School>[]>(() => [
    {
      accessorKey: "name",
      header: t("builder.schoolName"),
      cell: (cell) => (
        <span class="block min-w-0">
          <span class="block font-medium">{cell.row.original.name}</span>
          <span class="block truncate font-mono text-xs text-text-subtle" title={cell.row.original.id}>
            {cell.row.original.id.slice(0, 8)}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("builder.status"),
      cell: (cell) => <SchoolStatusBadge status={cell.row.original.status} />,
    },
    {
      id: "modules",
      header: t("builder.modules"),
      meta: { align: "right", cellClass: "tabular-nums" },
      cell: (cell) => cell.row.original.modules.length,
    },
    {
      accessorKey: "created_at",
      header: t("builder.createdAt"),
      cell: (cell) => <span class="text-sm">{formatDateTime(cell.row.original.created_at, locale())}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => open(cell.row.original) },
            { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => setEditTarget(cell.row.original) },
            { label: t("builder.resetAdminPassword"), icon: <IconLock class="h-4 w-4" />, onSelect: () => setAccess({ id: cell.row.original.id, mode: "password" }) },
            {
              label: t("builder.enterSchool"),
              icon: <IconExternalLink class="h-4 w-4" />,
              disabled: cell.row.original.status === "suspended",
              onSelect: () => setAccess({ id: cell.row.original.id, mode: "enter" }),
            },
            cell.row.original.status === "active"
              ? { label: t("builder.suspend"), icon: <IconLock class="h-4 w-4" />, onSelect: () => void setStatus(cell.row.original, "suspended") }
              : { label: t("builder.activate"), icon: <IconRotateCcw class="h-4 w-4" />, onSelect: () => void setStatus(cell.row.original, "active") },
            { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <BuilderHeader />
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <section class="space-y-4 p-0">
        <Suspense fallback={<DataTableSkeleton columns={5} rows={6} />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <Show when={!list.error}>
            <DataTable
              urlState
              title={t("builder.schools")}
              description={t("builder.schoolsSubtitle")}
              actions={
                <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("builder.createSchool")}
                </Button>
              }
              columns={columns()}
              data={list() ?? []}
            tableClass="min-w-[52rem]"
              empty={t("builder.noSchools")}
              filterColumn="name"
              enablePagination
              pageSize={SCHOOL_PAGE_SIZE}
              onRowClick={open}
            />
          </Show>
        </Suspense>
      </section>

      <CreateSchoolPanel
        open={createOpen()}
        onOpenChange={setCreateOpen}
        onCreated={(school) => {
          setCreateOpen(false);
          setFlash(t("common.created"));
          void refetch();
          open(school);
        }}
      />

      <SchoolEditPanel
        school={editTarget()}
        open={editTarget() !== null}
        onOpenChange={(value) => { if (!value) setEditTarget(null); }}
        onSaved={async () => {
          try { await refetch(); } catch { /* stale rows until the next load */ }
          setFlash(t("common.saved"));
        }}
      />

      <Show when={access()} keyed>
        {(target) => (
          <SchoolAdminAccessPanel
            id={target.id}
            mode={target.mode}
            onClose={() => setAccess(null)}
            onPasswordReset={() => {
              setAccess(null);
              setFlash(t("builder.passwordResetDone"));
            }}
            onEntered={async () => {
              setAccess(null);
              // The builder cookie is gone; this browser is now that admin.
              await auth.refresh();
              void navigate({ to: "/" });
            }}
          />
        )}
      </Show>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(value) => !value && setDeleteTarget(null)}
        title={t("builder.deleteSchool")}
        description={t("builder.deleteSchoolWarning")}
        variant="destructive"
        summary={deleteTarget() ? `${deleteTarget()!.name} · ${deleteTarget()!.id}` : ""}
        onConfirm={async () => {
          const school = deleteTarget();
          if (!school) return;
          try {
            await deleteSchool(school.id);
            await refetch();
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
