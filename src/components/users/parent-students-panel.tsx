import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { getParentStudents } from "@/api/parents";
import { postParentStudent } from "@/api/parents";
import { deleteParentStudent } from "@/api/parents";
import { formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/client";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { IconTrash, IconPlus } from "@/components/ui/icons";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";

export function ParentStudentsPanel(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: PersonRef | null;
}) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();

  const [students, { refetch }] = createResource(
    () => (props.open && props.parent ? props.parent.id : null),
    async (id) => (await getParentStudents(id)).items
  );

  const [selectedStudentId, setSelectedStudentId] = createSignal("");

  const handleAdd = async () => {
    if (!props.parent || !selectedStudentId()) return;
    setError("");
    try {
      await postParentStudent(props.parent.id, selectedStudentId());
      await refetch();
      setSelectedStudentId("");
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleRemove = async (studentId: string) => {
    if (!props.parent) return;
    setError("");
    try {
      await deleteParentStudent(props.parent.id, studentId);
      await refetch();
      setFlash(t("common.deleted"));
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
      title={t("nav.myStudents")}
      description={props.parent ? personLabel(props.parent) : ""}
    >
      <div class="flex flex-col h-full space-y-6 p-4">
        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

        <div class="flex items-end gap-2">
          <div class="flex-1">
            <UserSearchSelect
              id="parent-student-select"
              role={undefined}
              value={selectedStudentId()}
              onChange={setSelectedStudentId}
              label={t("events.selectAttendee")}
            />
          </div>
          <Button onClick={handleAdd} disabled={!selectedStudentId()}>
            <IconPlus class="mr-2 h-4 w-4" />
            {t("common.create")}
          </Button>
        </div>

        <div class="flex-1 overflow-auto rounded-md border">
          <Suspense fallback={<div class="p-8"><PageSpinner /></div>}>
            <Show when={students()}>
              <Show when={students()!.length > 0} fallback={<div class="p-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</div>}>
                <div class="divide-y">
                  <For each={students()}>
                    {(student) => (
                      <div class="flex items-center justify-between p-3">
                        <div class="min-w-0">
                          <div class="truncate text-sm font-medium">{personLabel(student)}</div>
                          <div class="truncate text-xs text-muted-foreground">@{student.username}</div>
                        </div>
                        <Button variant="ghost" size="icon" class="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemove(student.id)}>
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
    </SidePanel>
  );
}
