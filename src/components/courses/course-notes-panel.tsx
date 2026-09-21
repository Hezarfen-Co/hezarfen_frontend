import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
import { deleteCourseNoteById, getCourseNotes, patchCourseNoteById, postCourseNote, postCourseNoteFile } from "@/api/course-notes";
import { formatApiError } from "@/api/client";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { IconPlus } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { SidePanel } from "@/components/ui/side-panel";
import { createFlash } from "@/lib/flash";
import { courseNoteFiles } from "@/lib/note-source";
import { matchesSearch } from "@/lib/search-text";
import { useT } from "@/stores/preferences-context";

const NOTE_PAGE_SIZE = 6;

export function CourseNotesPanel(props: {
  courseId: string;
  canManage: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
}) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [page, setPage] = createSignal(0);
  const pageSize = createResponsivePageSize(NOTE_PAGE_SIZE);
  const [search, setSearch] = createSignal("");

  const [list, { refetch }] = createResource(
    () => props.courseId,
    (courseId) => getCourseNotes(courseId, { limit: 100 }),
  );

  const allNotes = () => list()?.items ?? [];
  const filteredNotes = createMemo(() => {
    const query = search().trim();
    return query ? allNotes().filter((note) => matchesSearch(query, note.title, note.content)) : allNotes();
  });
  const total = () => filteredNotes().length;
  const pageItems = createMemo(() => filteredNotes().slice(page() * pageSize(), (page() + 1) * pageSize()));
  const totalPages = createMemo(() => Math.max(1, Math.ceil(total() / pageSize())));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  createEffect(() => {
    search();
    pageSize();
    setPage(0);
  });

  createEffect(() => {
    const result = list();
    if (result) props.onCountChange(result.total);
  });

  createEffect(() => {
    if (page() > totalPages() - 1) setPage(totalPages() - 1);
  });

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
    <section class="min-w-0 space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !props.createOpen}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <div class="space-y-3 rounded-lg border border-border-line bg-surface-base p-3">
        <DataToolbar
          inline
          searchValue={search()}
          searchPlaceholder={t("common.searchPlaceholder")}
          searchHint={t("search.hint.courseNotes")}
          onSearchInput={setSearch}
          actions={
            <Show when={props.canManage}>
              <Button type="button" size="sm" class="shrink-0 rounded-lg" onClick={() => props.onCreateOpenChange(true)}>
                <IconPlus class="h-4 w-4" />{t("courseNotes.add")}
              </Button>
            </Show>
          }
        />
      </div>

      <Show when={props.canManage}>
        <SidePanel guardUnsaved open={props.createOpen} onOpenChange={props.onCreateOpenChange} title={t("courseNotes.new")}>
          <NoteForm
            enableFiles
            submitLabel={t("common.create")}
            onCancel={() => props.onCreateOpenChange(false)}
            onSubmit={async (values) => {
              setError("");
              const note = await postCourseNote({
                course: props.courseId,
                title: values.title,
                content: values.content || undefined,
              });
              let failedUploads = 0;
              for (const file of values.files) {
                try {
                  await postCourseNoteFile(note.id, file);
                } catch {
                  failedUploads += 1;
                }
              }
              await refetch();
              props.onCreateOpenChange(false);
              if (failedUploads > 0) {
                setError(t("notes.fileUploadPartial", { count: failedUploads }));
                return;
              }
              setFlash(t("common.created"));
            }}
          />
        </SidePanel>
      </Show>

      <div class="rounded-xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4">
        <Suspense fallback={<PageSpinner />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <Show when={list()}>
            <NoteList
              notes={pageItems()}
              source={courseNoteFiles}
              canManage={props.canManage}
              emptyTitle={t("courseNotes.empty")}
              emptyDescription={props.canManage ? t("courseNotes.emptyManageHint") : undefined}
              onUpdate={(id, values) =>
                wrap(async () => {
                  await patchCourseNoteById(id, values);
                }, t("common.saved"))
              }
              onDelete={(id) =>
                wrap(async () => {
                  await deleteCourseNoteById(id);
                }, t("common.deleted"))
              }
            />
            <Show when={total() > pageSize()}>
              <TablePagination pageIndex={safePage()} pageCount={totalPages()} onPageChange={setPage} />
            </Show>
          </Show>
        </Suspense>
      </div>
    </section>
  );
}
