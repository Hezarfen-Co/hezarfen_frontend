import { For, Show, Suspense, createEffect, createResource, createSignal } from "solid-js";
import { deleteSubjectById } from "@/api/deleteSubjectById";
import { getCourseSubjects } from "@/api/getCourseSubjects";
import { patchSubjectById } from "@/api/patchSubjectById";
import { postCourseSubject } from "@/api/postCourseSubject";
import { formatApiError } from "@/api/client";
import type { Subject } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { useT } from "@/stores/preferences-context";

export function CourseSubjectsPanel(props: { courseId: string; canManage: boolean; active: boolean }) {
  const t = useT();
  const [subjects, { refetch }] = createResource(
    () => (props.active ? props.courseId : null),
    async (courseId) => (courseId ? (await getCourseSubjects(courseId)).items : []),
  );
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<Subject | null>(null);
  const [removeSubject, setRemoveSubject] = createSignal<Subject | null>(null);
  const [name, setName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  createEffect(() => {
    const subject = editing();
    setName(subject?.name ?? "");
    setDescription(subject?.description ?? "");
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPanelOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setPanelOpen(true);
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
    <div class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={props.canManage}>
        <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={openCreate}>
          <IconPlus class="h-4 w-4" />
          {t("subjects.add")}
        </Button>
      </Show>

      <SidePanel open={panelOpen()} onOpenChange={setPanelOpen} title={editing() ? t("subjects.edit") : t("subjects.add")} description={t("subjects.help")}>
        <form class="space-y-3" onSubmit={(event) => void save(event)}>
          <div class="space-y-1.5">
            <Label for="subject-name">{t("subjects.name")}</Label>
            <Input id="subject-name" required maxlength={200} value={name()} onInput={(event) => setName(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="subject-description">{t("form.description")}</Label>
            <Textarea id="subject-description" maxlength={2000} rows={3} value={description()} onInput={(event) => setDescription(event.currentTarget.value)} />
          </div>
          {error() && <p class="text-sm text-destructive">{error()}</p>}
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-sm" disabled={pending()}>
              {editing() ? t("common.update") : t("common.create")}
            </Button>
            <Button type="button" variant="outline" class="rounded-sm" onClick={() => setPanelOpen(false)}>
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

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={(subjects() ?? []).length > 0} fallback={<EmptyState title={t("subjects.empty")} />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("subjects.name")}</TableHead>
                <TableHead>{t("form.description")}</TableHead>
                <Show when={props.canManage}>
                  <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                </Show>
              </TableRow>
            </TableHeader>
            <TableBody>
              <For each={subjects() ?? []}>
                {(subject) => (
                  <TableRow>
                    <TableCell class="font-medium">{subject.name}</TableCell>
                    <TableCell class="text-sm text-muted-foreground">{subject.description || "—"}</TableCell>
                    <Show when={props.canManage}>
                      <TableCell class="px-1 text-center">
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[
                            { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => openEdit(subject) },
                            {
                              label: t("common.remove"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setRemoveSubject(subject),
                            },
                          ]}
                        />
                      </TableCell>
                    </Show>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </Show>
      </Suspense>
    </div>
  );
}
