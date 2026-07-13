import { createResource, Show, Suspense, createSignal } from "solid-js";
import { deleteNoteById } from "@/api/deleteNoteById";
import { getNotes } from "@/api/getNotes";
import { patchNoteById } from "@/api/patchNoteById";
import { postNote } from "@/api/postNote";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { IconPlus } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

export default function NotesPage() {
  return (
    <RouteGuard>
      <NotesContent />
    </RouteGuard>
  );
}

function NotesContent() {
  const t = useT();
  const [notes, { refetch }] = createResource(() => getNotes());
  const [error, setError] = createSignal("");
  const [createOpen, setCreateOpen] = createSignal(false);

  const wrap = async (fn: () => Promise<void>) => {
    setError("");
    try {
      await fn();
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader
        accent="amber"
        eyebrow={t("nav.notes")}
        title={t("notes.title")}
        description={t("notes.subtitle")}
        actions={
          <Button type="button" size="sm" class="rounded-md" onClick={() => setCreateOpen(true)}>
            <IconPlus class="h-4 w-4" />
            {t("notes.new")}
          </Button>
        }
      />

      <FormDialog
        open={createOpen()}
        onOpenChange={setCreateOpen}
        title={t("notes.new")}
        description={t("notes.subtitle")}
      >
        <NoteForm
          submitLabel={t("common.create")}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            await postNote({
              title: values.title,
              content: values.content || undefined,
            });
            await refetch();
            setCreateOpen(false);
          }}
        />
      </FormDialog>

      <div class="space-y-5">
        <section class="min-w-0">
          {error() && <p class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}
          <Suspense fallback={<PageSpinner />}>
            <Show when={notes.error}>
              <Alert variant="destructive">{formatApiError(notes.error)}</Alert>
            </Show>
            <Show when={notes()}>
              {(list) => (
                <NoteList
                  notes={list()}
                  emptyLabel={t("notes.empty")}
                  onUpdate={(id, values) =>
                    wrap(async () => {
                      await patchNoteById(id, values);
                    })
                  }
                  onDelete={(id) =>
                    wrap(async () => {
                      await deleteNoteById(id);
                    })
                  }
                />
              )}
            </Show>
          </Suspense>
        </section>
      </div>
    </div>
  );
}
