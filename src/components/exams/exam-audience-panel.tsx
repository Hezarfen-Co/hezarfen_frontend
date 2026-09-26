import { Show, Suspense, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { createResource } from "@/lib/create-resource";
import { getClasses, getClassInstances } from "@/api/classes";
import { deleteExamAudienceByInstanceId, getExamAudience, postExamAudience } from "@/api/exams";
import { formatApiError, type ClassGroup, type ExamAudience } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { useT } from "@/stores/preferences-context";

type AudienceRow = ExamAudience & { owner: boolean; label: string };

/**
 * The sections a shared exam is announced to beyond its owner. Announcing puts
 * the exam — and its marks — into the sibling section's lists and report card;
 * the backend only accepts a section that teaches the same catalog course in
 * the same academic year, so the picker offers exactly those.
 */
export function ExamAudiencePanel(props: {
  examId: string;
  /** The exam's own instance (`class_course`). */
  ownerInstanceId: string;
  /** The catalog course the owner instance teaches; null while it resolves. */
  courseId: string | null;
  /** Announce/withdraw rights; the list itself is readable either way. */
  canManage: boolean;
}) {
  const t = useT();
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");
  const [addOpen, setAddOpen] = createSignal(false);
  const [selected, setSelected] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [removing, setRemoving] = createSignal<AudienceRow | null>(null);

  const [audience, { mutate }] = createResource(() => props.examId, (examId) => getExamAudience(examId));
  // Section names label both the table and the picker. Teacher+ reads the
  // school's class list; one read covers every row.
  const [classes] = createResource(async () => {
    try {
      return (await getClasses({ limit: 200 })).items;
    } catch {
      return [] as ClassGroup[];
    }
  });
  const classById = createMemo(() => new Map((classes() ?? []).map((klass) => [klass.id, klass])));
  const className = (classId: string) => classById().get(classId)?.name ?? "—";

  const rows = createMemo<AudienceRow[]>(() =>
    (audience() ?? []).map((row) => ({
      ...row,
      owner: row.instance === props.ownerInstanceId,
      label: className(row.class),
    })),
  );

  // Candidates load only when the picker opens: one read per same-year şube.
  const [candidates] = createResource(
    () => (addOpen() && props.courseId && classes() ? props.courseId : null),
    async (courseId) => {
      const owner = (audience() ?? []).find((row) => row.instance === props.ownerInstanceId);
      const ownerYear = owner ? classById().get(owner.class)?.year ?? null : null;
      const siblings = (classes() ?? []).filter((klass) => klass.year === ownerYear);
      const perClass = await Promise.all(
        siblings.map(async (klass) => {
          try {
            return (await getClassInstances(klass.id, { limit: 200 })).items;
          } catch {
            return [];
          }
        }),
      );
      return perClass
        .flat()
        .filter((instance) => instance.course === courseId)
        .map((instance) => ({ value: instance.id, label: className(instance.class) }))
        .sort((a, b) => a.label.localeCompare(b.label, "tr"));
    },
  );
  const options = () => {
    const taken = new Set((audience() ?? []).map((row) => row.instance));
    return (candidates() ?? []).filter((option) => !taken.has(option.value));
  };

  const add = async () => {
    const instanceId = selected();
    if (!instanceId || saving()) return;
    setSaving(true);
    setError("");
    try {
      mutate(await postExamAudience(props.examId, instanceId));
      setSelected("");
      setAddOpen(false);
      setFlash(t("exams.audience.added"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const row = removing();
    if (!row) return;
    setError("");
    try {
      mutate(await deleteExamAudienceByInstanceId(props.examId, row.instance));
      setFlash(t("exams.audience.removed"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setRemoving(null);
    }
  };

  const columns = createMemo<ColumnDef<AudienceRow>[]>(() => [
    {
      accessorKey: "label",
      header: t("exams.audience.section"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "status",
      header: t("exams.audience.status"),
      cell: (cell) => (
        <Badge variant={cell.row.original.owner ? "default" : "secondary"}>
          {cell.row.original.owner ? t("exams.audience.owner") : t("exams.audience.shared")}
        </Badge>
      ),
    },
    ...(props.canManage
      ? [
          {
            id: "actions",
            header: t("common.actions"),
            meta: {
              headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
              cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
            },
            cell: (cell) => (
              <Show when={!cell.row.original.owner}>
                <TableRowActions
                  label={t("common.actions")}
                  actions={[
                    {
                      label: t("exams.audience.remove"),
                      icon: <IconTrash class="h-4 w-4" />,
                      destructive: true,
                      onSelect: () => setRemoving(cell.row.original),
                    },
                  ]}
                />
              </Show>
            ),
          } satisfies ColumnDef<AudienceRow>,
        ]
      : []),
  ]);

  return (
    <div class="space-y-3">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>
      <Suspense fallback={<DataTableSkeleton columns={2} rows={3} />}>
        <Show when={!audience.error} fallback={<Alert variant="destructive">{formatApiError(audience.error)}</Alert>}>
          <DataTable
            columns={columns()}
            data={rows()}
            title={t("exams.audience.tab")}
            description={t("exams.audience.description")}
            empty={t("exams.audience.empty")}
            enablePagination={false}
            enableColumnVisibility={false}
            actions={
              <Show when={props.canManage}>
                <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("exams.audience.add")}
                </Button>
              </Show>
            }
          />
        </Show>
      </Suspense>

      <SidePanel
        open={addOpen()}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setSelected("");
        }}
        title={t("exams.audience.add")}
        description={t("exams.audience.addHelp")}
      >
        <div class="space-y-4 p-4">
          <Show
            when={!candidates.loading}
            fallback={<DataTableSkeleton columns={1} rows={3} />}
          >
            <Show when={options().length > 0} fallback={<p class="text-sm text-muted-foreground">{t("exams.audience.noCandidates")}</p>}>
              <div class="space-y-1.5">
                <Label for="exam-audience-section">{t("exams.audience.section")}</Label>
                <SearchableSelect id="exam-audience-section" value={selected()} onChange={setSelected} options={options()} />
              </div>
              <div class="flex justify-end">
                <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" disabled={!selected() || saving()} onClick={() => void add()}>
                  <IconPlus class="h-4 w-4" />
                  {t("exams.audience.add")}
                </Button>
              </div>
            </Show>
          </Show>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={removing() !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("exams.audience.remove")}
        summary={t("exams.audience.removeConfirm", { section: removing()?.label ?? "" })}
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
}
