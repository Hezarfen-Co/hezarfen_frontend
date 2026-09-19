import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteClassBlueprintByGrade, getClassBlueprints, getClassBlueprintStatus } from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getLimits } from "@/api/limits";
import { formatApiError, type BlueprintResult, type BlueprintSectionStatus, type BlueprintSkip, type BlueprintStatus, type ClassBlueprint } from "@/api/client";
import { BlueprintPanel } from "@/components/classes/blueprint-panel";
import { BlueprintSkippedReport } from "@/components/classes/blueprint-skipped-report";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconClipboardCheck, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function BlueprintsTab(props: {
  /** Every blueprint route is manager+; below that the tab is not rendered. */
  canManage: () => boolean;
  /** Tabs keep both panels mounted, so the list is only fetched once opened. */
  active: () => boolean;
}) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<ClassBlueprint | null>(null);
  const [deleting, setDeleting] = createSignal<ClassBlueprint | null>(null);
  const [skipped, setSkipped] = createSignal<BlueprintSkip[]>([]);
  const [unmatchedGrade, setUnmatchedGrade] = createSignal<string | null>(null);
  const [reportOpen, setReportOpen] = createSignal(false);
  const [status, setStatus] = createSignal<BlueprintStatus | null>(null);

  const enabled = () => (props.active() && props.canManage() ? true : null);
  const [list, { refetch }] = createResource(enabled, async () =>
    (await getClassBlueprints({ limit: 200 })).items,
  );
  const [courses] = createResource(enabled, async () => (await getCourses({ limit: 200 })).items);
  const [limits] = createResource(enabled, () => getLimits());

  const courseTitle = (id: string) => courses.latest?.find((c) => c.id === id)?.title ?? id;

  const columns = createMemo<ColumnDef<ClassBlueprint>[]>(() => [
    {
      id: "grade",
      accessorFn: (row) => row.grade,
      header: t("classBlueprints.grade"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "count",
      accessorFn: (row) => t("classBlueprints.courseCount", { count: row.courses.length }),
      header: t("classBlueprints.courseCountColumn"),
    },
    {
      id: "titles",
      accessorFn: (row) => {
        const names = row.courses.slice(0, 3).map(courseTitle);
        const rest = row.courses.length - names.length;
        return rest > 0 ? `${names.join(", ")} +${rest}` : names.join(", ") || "—";
      },
      header: t("classBlueprints.courses"),
      meta: { cellClass: "text-muted-foreground" },
    },
    {
      id: "creator",
      accessorFn: (row) => personLabel(row.creator),
      header: t("common.creator"),
      meta: { cellClass: "text-muted-foreground" },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("classBlueprints.edit"),
              icon: <IconEdit class="h-4 w-4" />,
              onSelect: () => {
                setEditing(cell.row.original);
                setPanelOpen(true);
              },
            },
            {
              label: t("classBlueprints.delete"),
              icon: <IconTrash class="h-4 w-4" />,
              destructive: true,
              onSelect: () => setDeleting(cell.row.original),
            },
            {
              label: t("classBlueprints.status"),
              icon: <IconClipboardCheck class="h-4 w-4" />,
              onSelect: () => void checkStatus(cell.row.original.grade),
            },
          ]}
        />
      ),
    },
  ]);

  // A saved blueprint is not an error even when some pairs did not attach: the
  // template was written either way, so the toast fires and the shortfall is a
  // separate, dismissible report.
  const handleSaved = async (result: BlueprintResult) => {
    setPanelOpen(false);
    setEditing(null);
    await refetch();
    setSkipped(result.skipped);
    // A grade label nobody carries is saved just the same, so it must not
    // read as "applied" — that is the one outcome the admin needs to fix.
    if (result.matched === 0) {
      setUnmatchedGrade(result.blueprint.grade);
      return;
    }
    setUnmatchedGrade(null);
    setFlash(t("classBlueprints.savedMatched", { count: result.matched }));
  };

  const remove = async () => {
    const bp = deleting();
    if (!bp) return;
    setError("");
    try {
      await deleteClassBlueprintByGrade(bp.grade);
      setDeleting(null);
      await refetch();
      setFlash(t("classBlueprints.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };
  const checkStatus = async (grade: string) => {
    setError("");
    try {
      setStatus(await getClassBlueprintStatus(grade));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const statusColumns = createMemo<ColumnDef<BlueprintSectionStatus>[]>(() => [
    {
      id: "section",
      accessorFn: (row) => row.class_name || row.class,
      header: t("classBlueprints.statusSection"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "missing",
      accessorFn: (row) => row.missing.map(courseTitle).join(", ") || "—",
      header: t("classBlueprints.statusMissing"),
      meta: { cellClass: "text-muted-foreground" },
    },
  ]);

  return (
    <div class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Show when={unmatchedGrade()}>
        {(grade) => (
          <Alert class="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            {t("classBlueprints.noMatch", { grade: grade() })}
          </Alert>
        )}
      </Show>
      <Show when={skipped().length > 0}>
        <Alert class="flex flex-wrap items-center justify-between gap-3 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <span class="min-w-0 flex-1">{t("classBlueprints.skippedSummary", { count: skipped().length })}</span>
          <Button type="button" size="sm" variant="outline" class="shrink-0 rounded-lg" onClick={() => setReportOpen(true)}>
            {t("classBlueprints.skippedDetails")}
          </Button>
        </Alert>
      </Show>

      {/* The list is read through `.latest`, so a refetch after a save never
          re-suspends the tab; the skeleton only covers the first load. */}
      <Show when={!list.loading || list.latest} fallback={<DataTableSkeleton />}>
        <DataTable
          columns={columns()}
          data={list.latest ?? []}
          filterColumn="grade"
          enablePagination
          pageSize={10}
          title={t("classBlueprints.title")}
          description={t("classBlueprints.subtitle")}
          empty={t("classBlueprints.empty")}
          actions={
            <Button
              size="sm"
              class="rounded-lg"
              onClick={() => {
                setEditing(null);
                setPanelOpen(true);
              }}
            >
              <IconPlus class="h-4 w-4" />
              {t("classBlueprints.new")}
            </Button>
          }
        />
      </Show>

      <BlueprintPanel
        open={panelOpen()}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) setEditing(null);
        }}
        blueprint={editing()}
        courses={courses.latest ?? []}
        maxCourses={limits.latest?.course.max_class_courses ?? 50}
        maxGradeLen={limits.latest?.course.max_class_grade_len ?? 20}
        onSaved={(result) => void handleSaved(result)}
      />

      <BlueprintSkippedReport
        open={reportOpen()}
        onOpenChange={setReportOpen}
        skipped={skipped()}
        courseTitle={courseTitle}
      />

      <SidePanel
        open={status() != null}
        onOpenChange={(open) => !open && setStatus(null)}
        title={t("classBlueprints.statusTitle", { grade: status()?.grade ?? "" })}
        size="wide"
      >
        <Show when={status()}>
          {(current) => (
            <Show
              when={current().sections.some((section) => section.missing.length > 0)}
              fallback={<p class="text-sm text-muted-foreground">{t("classBlueprints.statusEmpty")}</p>}
            >
              <DataTable
                columns={statusColumns()}
                data={current().sections.filter((section) => section.missing.length > 0)}
              />
            </Show>
          )}
        </Show>
      </SidePanel>
      <ConfirmDialog
        open={deleting() !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("classBlueprints.delete")}
        summary={t("classBlueprints.deleteConfirm", { grade: deleting()?.grade ?? "" })}
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
}
