import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteSubjectById } from "@/api/subjects";
import { getCourseSubjects } from "@/api/courses";
import { patchSubjectById } from "@/api/subjects";
import { postCourseSubject } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { Subject } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { matchesSearch } from "@/lib/search-text";
import { useT } from "@/stores/preferences-context";

export function CourseSubjectsPanel(props: { courseId: string; canManage: boolean; createOpen: boolean; onCreateOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [subjects, { refetch }] = createResource(
    () => props.courseId,
    async (courseId) => (courseId ? (await getCourseSubjects(courseId)).items : []),
  );
  const [editing, setEditing] = createSignal<Subject | null>(null);
  const [removeSubject, setRemoveSubject] = createSignal<Subject | null>(null);
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();
  const [search, setSearch] = createSignal("");
  const visibleSubjects = createMemo(() => {
    const query = search().trim();
    return query ? (subjects() ?? []).filter((subject) => matchesSearch(query, subject.name, subject.description)) : subjects() ?? [];
  });
  const columns = createMemo<ColumnDef<Subject>[]>(() => [
    {
      accessorKey: "name",
      header: t("subjects.name"),
      cell: (cell) => <span class="block truncate font-medium">{cell.row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: t("form.description"),
      meta: { cellClass: "text-sm text-text-subtle" },
      cell: (cell) => <span class="block truncate">{cell.row.original.description || "—"}</span>,
    },
    ...(props.canManage
      ? [{
          id: "actions",
          header: t("common.actions"),
          meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
          cell: (cell) => (
            <TableRowActions
              label={t("common.actions")}
              actions={[
                { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => openEdit(cell.row.original) },
                {
                  label: t("common.remove"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setRemoveSubject(cell.row.original),
                },
              ]}
            />
          ),
        } satisfies ColumnDef<Subject>]
      : []),
  ]);

  createEffect(() => {
    const subject = editing();
    setName(subject?.name ?? "");
    setDescription(subject?.description ?? "");
  });

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    props.onCreateOpenChange(true);
  };

  const setPanelOpen = (open: boolean) => {
    props.onCreateOpenChange(open);
    if (!open) setEditing(null);
  };

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const body = { name: name().trim(), description: description().trim() };
      const subject = editing();
      if (subject) await patchSubjectById(subject.id, body);
      else await postCourseSubject(props.courseId, body);
      setPanelOpen(false);
      setEditing(null);
      await refetch();
      setFlash(subject ? t("common.saved") : t("common.created"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-3">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <SidePanel guardUnsaved open={props.createOpen} onOpenChange={setPanelOpen} title={editing() ? t("subjects.edit") : t("subjects.add")} description={t("subjects.help")}>
        <form class="space-y-3" onSubmit={(event) => void save(event)}>
          <div class="space-y-1.5">
            <Label for="subject-name">{t("subjects.name")}</Label>
            <Input id="subject-name" required maxlength={200} value={name()} onInput={(event) => setName(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="subject-description">{t("form.description")}</Label>
            <Textarea id="subject-description" maxlength={2000} rows={3} value={description()} onInput={(event) => setDescription(event.currentTarget.value)} />
          </div>
          {error() && <p class="text-sm text-destructive-text">{error()}</p>}
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-lg" disabled={pending()}>
              {editing() ? t("common.update") : t("common.create")}
            </Button>
            <Button type="button" variant="outline" class="rounded-lg" onClick={() => setPanelOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={removeSubject() != null}
        onOpenChange={(open) => {
          if (!open) setRemoveSubject(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={removeSubject()?.name ?? ""}
        onConfirm={async () => {
          const subject = removeSubject();
          if (!subject) return;
          setError("");
          try {
            await deleteSubjectById(subject.id);
            await refetch();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setRemoveSubject(null);
          }
        }}
      />

      {error() && <p class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>}

      {/* The table draws its toolbar (search, add, columns) and grid as two
          sibling cards, like the list pages; no frame around them. */}
      <Suspense fallback={<DataTableSkeleton />}>
        <DataTable
          columns={columns()}
          data={visibleSubjects()}
          searchValue={search()}
          onSearchInput={setSearch}
          filterPlaceholder={t("common.searchPlaceholder")}
          enablePagination
          pageSize={10}
          empty={t("subjects.empty")}
          emptyIllustration="courses"
          actions={props.canManage ? (
            <Button type="button" size="sm" onClick={() => props.onCreateOpenChange(true)}>
              <IconPlus class="h-4 w-4" />{t("subjects.add")}
            </Button>
          ) : undefined}
        />
      </Suspense>
    </div>
  );
}
