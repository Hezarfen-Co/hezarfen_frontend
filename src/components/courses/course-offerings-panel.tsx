import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getCourseSubjects } from "@/api/courses";
import { getLimits } from "@/api/limits";
import { deleteOfferingById, getOfferings } from "@/api/offerings";
import { getSettings } from "@/api/settings";
import { formatApiError, type Offering } from "@/api/client";
import { OfferingPanel } from "@/components/courses/offering-panel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { gradeLevelLabel } from "@/lib/grade-level";
import { useT } from "@/stores/preferences-context";

/** A catalog course's grade templates; manager+ edits them. */
export function CourseOfferingsPanel(props: { courseId: string; courseTitle: string; canEdit: boolean; active: boolean }) {
  const t = useT();
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [selected, setSelected] = createSignal<Offering | null>(null);
  const [deleting, setDeleting] = createSignal<Offering | null>(null);

  const source = () => (props.active ? props.courseId : null);
  const [offerings, { refetch }] = createResource(source, async (courseId) =>
    (await getOfferings({ course: courseId })).items.slice().sort((a, b) => a.grade_level - b.grade_level),
  );
  const [subjects] = createResource(() => (panelOpen() ? props.courseId : null), async (courseId) => (await getCourseSubjects(courseId)).items);
  const [settings] = createResource(() => (panelOpen() ? true : null), () => getSettings());
  const [limits] = createResource(() => (props.active ? true : null), () => getLimits());

  const open = (offering: Offering | null) => {
    setSelected(offering);
    setPanelOpen(true);
  };

  const inherited = (value: string | number | null, fallback: string) =>
    value == null || value === "" ? <span class="text-muted-foreground">{fallback}</span> : String(value);

  const columns = createMemo<ColumnDef<Offering>[]>(() => [
    {
      id: "grade",
      accessorFn: (row) => row.grade_level,
      header: t("classGroups.grade"),
      meta: { cellClass: "font-medium whitespace-nowrap" },
      cell: (cell) => gradeLevelLabel(cell.row.original.grade_level, t),
    },
    {
      id: "title",
      accessorFn: (row) => row.title ?? props.courseTitle,
      header: t("form.title"),
      cell: (cell) => inherited(cell.row.original.title, props.courseTitle),
    },
    {
      id: "hours",
      accessorFn: (row) => row.default_ders_saati ?? 1,
      header: t("instances.dersSaati"),
      cell: (cell) => inherited(cell.row.original.default_ders_saati, "1"),
    },
    {
      id: "karne",
      accessorFn: (row) => row.default_counts_toward_karne,
      header: t("instances.countsTowardKarne"),
      cell: (cell) => {
        const value = cell.row.original.default_counts_toward_karne;
        return value == null ? <span class="text-muted-foreground">{t("common.yes")}</span> : value ? t("common.yes") : t("common.no");
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            props.canEdit
              ? { label: t("offerings.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => open(cell.row.original) }
              : { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => open(cell.row.original) },
            ...(props.canEdit
              ? [{ label: t("offerings.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleting(cell.row.original) }]
              : []),
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-3">
      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
      <Show when={!offerings.loading || offerings.latest} fallback={<DataTableSkeleton />}>
        <DataTable
          columns={columns()}
          data={offerings.latest ?? []}
          title={t("offerings.tab")}
          description={t("offerings.help")}
          empty={t("offerings.empty")}
          onRowClick={(offering) => open(offering)}
          actions={
            <Show when={props.canEdit}>
              <Button type="button" size="sm" onClick={() => open(null)}>
                <IconPlus class="h-4 w-4" />
                {t("offerings.new")}
              </Button>
            </Show>
          }
        />
      </Show>

      <OfferingPanel
        open={panelOpen()}
        onOpenChange={(value) => {
          setPanelOpen(value);
          if (!value) setSelected(null);
        }}
        courseId={props.courseId}
        courseTitle={props.courseTitle}
        offering={selected()}
        canEdit={props.canEdit}
        courseSubjects={subjects.latest ?? []}
        examKinds={(settings.latest?.exam_kinds ?? []).map((kind) => kind.name)}
        limits={limits.latest ?? undefined}
        onSaved={async (saved) => {
          const created = selected() === null;
          await refetch();
          setFlash(created ? t("common.created") : t("common.saved"));
          // A new template stays open on itself, so its topics, week and
          // weights can be filled in right away.
          setSelected(saved);
        }}
      />

      <ConfirmDialog
        open={deleting() !== null}
        onOpenChange={(value) => !value && setDeleting(null)}
        title={t("offerings.delete")}
        summary={t("offerings.deleteConfirm", { grade: deleting() ? gradeLevelLabel(deleting()!.grade_level, t) : "" })}
        variant="destructive"
        onConfirm={async () => {
          const target = deleting();
          if (!target) return;
          setError("");
          try {
            await deleteOfferingById(target.id);
            await refetch();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}
