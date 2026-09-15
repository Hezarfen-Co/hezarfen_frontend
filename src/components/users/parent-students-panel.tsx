import { For, Show, Suspense, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate } from "@tanstack/solid-router";
import { getParentStudents } from "@/api/parents";
import { postParentStudent } from "@/api/parents";
import { deleteParentStudent } from "@/api/parents";
import { formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/client";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronRight, IconPlus, IconTrash } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";

// Admin-facing: the students one parent is the guardian of. This is somebody
// else's list, never the viewer's own children — the parent's own view of the
// same relation lives at /students.
export function ParentStudentsPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: PersonRef | null;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [removing, setRemoving] = createSignal<PersonRef | null>(null);

  const [students, { refetch }] = createResource(
    () => (props.open && props.parent ? props.parent.id : null),
    async (id) => (await getParentStudents(id)).items
  );

  const [selectedStudentId, setSelectedStudentId] = createSignal("");

  const linkedIds = () => (students.latest ?? []).map((student) => student.id);

  const handleAdd = async () => {
    if (!props.parent || !selectedStudentId()) return;
    setError("");
    try {
      await postParentStudent(props.parent.id, selectedStudentId());
      await refetch();
      setSelectedStudentId("");
      setFlash(t("parentLink.linked"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleRemove = async () => {
    const student = removing();
    if (!props.parent || !student) return;
    setError("");
    try {
      await deleteParentStudent(props.parent.id, student.id);
      setRemoving(null);
      await refetch();
      setFlash(t("parentLink.removed"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <SidePanel
      open={props.open}
      onOpenChange={(open) => {
        if (!open) {
          setError("");
          setSelectedStudentId("");
        }
        props.onOpenChange(open);
      }}
      title={t("parentLink.title")}
      description={props.parent ? t("parentLink.subtitle", { name: personLabel(props.parent) }) : ""}
    >
      <div class="flex h-full flex-col space-y-6 p-4">
        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

        <div class="flex items-end gap-2">
          <div class="flex-1">
            {/* A guardian link only ever points at a student, so the picker
                must not offer teachers or other parents. */}
            <UserSearchSelect
              id="parent-student-select"
              role="student"
              value={selectedStudentId()}
              onChange={setSelectedStudentId}
              label={t("parentLink.selectStudent")}
              excludeIds={linkedIds()}
            />
          </div>
          <Button onClick={handleAdd} disabled={!selectedStudentId()}>
            <IconPlus class="mr-2 h-4 w-4" />
            {t("parentLink.add")}
          </Button>
        </div>

        <div class="flex-1 overflow-auto rounded-md border">
          <Suspense fallback={<div class="p-8"><PageSpinner /></div>}>
            <Show when={students()}>
              <Show
                when={students()!.length > 0}
                fallback={<div class="p-8 text-center text-sm text-muted-foreground">{t("parentLink.empty")}</div>}
              >
                <div class="divide-y">
                  <For each={students()}>
                    {(student) => (
                      <div class="flex items-center gap-2 p-3">
                        {/* A router <Link> inside this modal panel never
                            navigates — the dialog's dismiss handling swallows
                            the click — so close the panel first, then go. */}
                        <button
                          type="button"
                          class="group min-w-0 flex-1 rounded-md text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                          title={t("profile.viewProfile")}
                          onClick={() => {
                            props.onOpenChange(false);
                            void navigate({ to: "/profile/$userId", params: { userId: student.id } });
                          }}
                        >
                          <div class="flex items-center gap-1 truncate text-sm font-medium group-hover:underline">
                            {personLabel(student)}
                            <IconChevronRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </div>
                          <div class="truncate text-xs text-muted-foreground">@{student.username}</div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={t("parentLink.remove")}
                          onClick={() => setRemoving(student)}
                        >
                          <IconTrash class="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Suspense>
        </div>
      </div>

      <ConfirmDialog
        open={removing() !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("parentLink.remove")}
        summary={t("parentLink.removeConfirm", {
          student: personLabel(removing()),
          parent: personLabel(props.parent),
        })}
        variant="destructive"
        onConfirm={handleRemove}
      />
    </SidePanel>
  );
}
