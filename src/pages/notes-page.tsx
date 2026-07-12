import { createResource, Show, Suspense, createSignal } from "solid-js";
import { deleteNoteById } from "@/api/deleteNoteById";
import { getNotes } from "@/api/getNotes";
import { patchNoteById } from "@/api/patchNoteById";
import { postNote } from "@/api/postNote";
import { formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { CollapsibleHelp } from "@/components/ui/collapsible-help";
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
      />

      <CollapsibleHelp title={t("notes.helpTitle")}>{t("notes.helpBody")}</CollapsibleHelp>

      <div class="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section class="surface-card h-fit p-5 lg:sticky lg:top-24">
          <h2 class="mb-4 font-display text-lg font-semibold">{t("notes.new")}</h2>
          <NoteForm
            submitLabel={t("common.create")}
            onSubmit={(values) =>
              wrap(async () => {
                await postNote({
                  title: values.title,
                  content: values.content || undefined,
                });
              })
            }
          />
          {error() && <p class="mt-3 text-sm text-destructive">{error()}</p>}
        </section>

        <section>
          <Suspense fallback={<PageSpinner />}>
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
