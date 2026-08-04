import { Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useLocation } from "@tanstack/solid-router";
import { deleteNoteById } from "@/api/notes";
import { getNotes } from "@/api/notes";
import { patchNoteById } from "@/api/notes";
import { postNote } from "@/api/notes";
import { postNoteFile } from "@/api/notes";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { NoteForm } from "@/components/notes/note-form";
import { NoteImportPanel } from "@/components/notes/note-import-panel";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { IconPlus, IconUploadCloud } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { createFlash } from "@/lib/flash";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { useT } from "@/stores/preferences-context";

const NOTE_PAGE_SIZE = 10;

export default function NotesPage() {
  return (
    <RouteGuard>
      <NotesContent />
    </RouteGuard>
  );
}

function NotesContent() {
  const t = useT();
  const location = useLocation();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [createOpen, setCreateOpen] = createSignal(location().searchStr.includes("action=new"));
  const [importOpen, setImportOpen] = createSignal(location().searchStr.includes("action=import"));
  createEffect(() => {
    if (location().searchStr.includes("action=new")) setCreateOpen(true);
    if (location().searchStr.includes("action=import")) setImportOpen(true);
  });
  const [page, setPage] = createSignal(0);

  const [list, { refetch }] = createResource(
    () => page(),
    async (currentPage) =>
      loadListPage({
        page: currentPage,
        pageSize: NOTE_PAGE_SIZE,
        clientMode: false,
        fetch: getNotes,
      }),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), NOTE_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  const wrap = async (fn: () => Promise<void>, okMessage: string) => {
    setError("");
    try {
      await fn();
      await refetch();
      setFlash(okMessage);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader
          eyebrow={t("nav.notes")}
          title={t("notes.title")}
          description={t("notes.subtitle")}
          actions={
            <div class="flex items-center gap-2">
              <Button type="button" size="sm" class="min-w-30 rounded-lg" onClick={() => setCreateOpen(true)}>
                <IconPlus class="h-4 w-4" />
                {t("notes.new")}
              </Button>
              <Button type="button" variant="outline" size="sm" class="min-w-30 rounded-lg" onClick={() => setImportOpen(true)}>
                <IconUploadCloud class="h-4 w-4" />
                {t("notes.import")}
              </Button>
            </div>
          }
        />
      </div>

      <SidePanel open={importOpen()} onOpenChange={setImportOpen} title={t("notes.import")}>
        <NoteImportPanel
          onCancel={() => setImportOpen(false)}
          onImport={async (importedTitle, importedMarkdown) => {
            setError("");
            await postNote({
              title: importedTitle,
              content: importedMarkdown || undefined,
            });
            await refetch();
            setImportOpen(false);
            setFlash(t("common.created"));
          }}
        />
      </SidePanel>

      <SidePanel open={createOpen()} onOpenChange={setCreateOpen} title={t("notes.new")}>
        <NoteForm
          enableFiles
          submitLabel={t("common.create")}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            setError("");
            const note = await postNote({
              title: values.title,
              content: values.content || undefined,
            });
            let failedUploads = 0;
            for (const file of values.files) {
              try {
                await postNoteFile(note.id, file);
              } catch {
                failedUploads += 1;
              }
            }
            await refetch();
            setCreateOpen(false);
            if (failedUploads > 0) {
              setError(t("notes.fileUploadPartial", { count: failedUploads }));
              return;
            }
            setFlash(t("common.created"));
          }}
        />
      </SidePanel>

      <div class="space-y-5">
        <section class="min-w-0 space-y-4 rounded-lg border border-border/60 bg-card/60 p-3 sm:p-4 dark:border-white/8 dark:bg-card/40 shadow-xs">
          <Show when={flash()}>
            <Alert variant="success">{flash()}</Alert>
          </Show>
          <Show when={error() && !createOpen() && !importOpen()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <Suspense fallback={<PageSpinner />}>
            <Show when={list.error}>
              <Alert variant="destructive">{formatApiError(list.error)}</Alert>
            </Show>
            <Show when={list()}>
              <NoteList
                notes={pageItems()}
                emptyTitle={t("dashboard.emptyNotesTitle")}
                emptyDescription={t("notes.empty")}
                onUpdate={(id, values) =>
                  wrap(async () => {
                    await patchNoteById(id, values);
                  }, t("common.saved"))
                }
                onDelete={(id) =>
                  wrap(async () => {
                    await deleteNoteById(id);
                  }, t("common.deleted"))
                }
              />
              <Show when={total() > NOTE_PAGE_SIZE}>
                <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Suspense>
        </section>
      </div>
    </div>
  );
}
