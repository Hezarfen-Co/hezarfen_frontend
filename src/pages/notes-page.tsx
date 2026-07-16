import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteNoteById } from "@/api/deleteNoteById";
import { getNotes } from "@/api/getNotes";
import { patchNoteById } from "@/api/patchNoteById";
import { postNote } from "@/api/postNote";
import { postNoteFile } from "@/api/postNoteFile";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { useT } from "@/stores/preferences-context";

const NOTE_PAGE_SIZE = 12;

export default function NotesPage() {
  return (
    <RouteGuard>
      <NotesContent />
    </RouteGuard>
  );
}

function NotesContent() {
  const t = useT();
  const [error, setError] = createSignal("");
  const [createOpen, setCreateOpen] = createSignal(false);
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
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.notes")}</span>
        </div>
        <PageHeader
          accent="amber"
          eyebrow={t("nav.notes")}
          title={t("notes.title")}
          description={t("notes.subtitle")}
          actions={
            <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
              <IconPlus class="h-4 w-4" />
              {t("notes.new")}
            </Button>
          }
        />
      </div>

      <SidePanel open={createOpen()} onOpenChange={setCreateOpen} title={t("notes.new")} description={t("notes.subtitle")}>
        <NoteForm
          enableFiles
          submitLabel={t("common.create")}
          onCancel={() => setCreateOpen(false)}
          onSubmit={async (values) => {
            const note = await postNote({
              title: values.title,
              content: values.content || undefined,
            });
            // ponytail: upload after create — file API needs note id
            for (const file of values.files) {
              await postNoteFile(note.id, file);
            }
            await refetch();
            setCreateOpen(false);
          }}
        />
      </SidePanel>

      <div class="space-y-5">
        <section class="min-w-0 space-y-4">
          {error() && <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}
          <Suspense fallback={<PageSpinner />}>
            <Show when={list.error}>
              <Alert variant="destructive">{formatApiError(list.error)}</Alert>
            </Show>
            <Show when={list()}>
              <NoteList
                notes={pageItems()}
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
