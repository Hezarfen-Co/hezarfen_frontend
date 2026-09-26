import { Show, Suspense, createEffect, createMemo, createSignal, on } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import { deleteNoteById } from "@/api/notes";
import { getNotes } from "@/api/notes";
import { patchNoteById } from "@/api/notes";
import { postNote } from "@/api/notes";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { NoteImportPanel } from "@/components/notes/note-import-panel";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { TOOLBAR_CARD, TOOLBAR_SLOT } from "@/components/ui/data-toolbar";
import { IconPlus, IconUploadCloud } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { SidePanel } from "@/components/ui/side-panel";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { personalNoteFiles } from "@/lib/note-source";
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
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [importOpen, setImportOpen] = createSignal(location().searchStr.includes("action=import"));
  createEffect(() => {
    // Old deep link: the new-note side panel is now its own page.
    if (location().searchStr.includes("action=new")) void navigate({ to: "/notes/new", replace: true });
    if (location().searchStr.includes("action=import")) setImportOpen(true);
  });
  const [page, setPage] = createSignal(0);
  const pageSize = createResponsivePageSize(NOTE_PAGE_SIZE);
  createEffect(on(pageSize, () => setPage(0), { defer: true }));

  const [list, { refetch }] = createResource(
    () => ({ page: page(), size: pageSize() }),
    async (source) =>
      loadListPage({
        page: source.page,
        pageSize: source.size,
        clientMode: false,
        fetch: getNotes,
      }),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), pageSize()));
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

      <div class="space-y-4">
        <div class={cn("flex flex-wrap items-center justify-end gap-2 max-sm:[&_button]:flex-1", TOOLBAR_CARD, TOOLBAR_SLOT)}>
          <Button type="button" size="sm" onClick={() => void navigate({ to: "/notes/new" })}>
            <IconPlus class="h-4 w-4" />
            {t("notes.new")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <IconUploadCloud class="h-4 w-4" />
            {t("notes.import")}
          </Button>
        </div>
        <div class="space-y-4">
          <Show when={flash()}>
            <Alert variant="success">{flash()}</Alert>
          </Show>
          <Show when={error() && !importOpen()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <Suspense fallback={<PageSpinner />}>
            <Show when={list.error}>
              <Alert variant="destructive">{formatApiError(list.error)}</Alert>
            </Show>
            <Show when={list()}>
              <NoteList
                notes={pageItems()}
                source={personalNoteFiles}
                onOpen={(note) => void navigate({ to: "/notes/$id", params: { id: note.id } })}
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
              <Show when={total() > pageSize()}>
                <TablePagination pageIndex={safePage()} pageCount={totalPages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
