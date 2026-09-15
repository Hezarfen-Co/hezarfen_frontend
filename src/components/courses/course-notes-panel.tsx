import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { deleteCourseNoteById, getCourseNotes, patchCourseNoteById, postCourseNote, postCourseNoteFile } from "@/api/course-notes";
import { formatApiError } from "@/api/client";
import { NoteForm } from "@/components/notes/note-form";
import { NoteList } from "@/components/notes/note-list";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { createFlash } from "@/lib/flash";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { courseNoteFiles } from "@/lib/note-source";
import { useT } from "@/stores/preferences-context";

const NOTE_PAGE_SIZE = 6;

export function CourseNotesPanel(props: {
  courseId: string;
  canManage: boolean;
  active: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
}) {
  const t = useT();
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [page, setPage] = createSignal(0);

  const [list, { refetch }] = createResource(
    () => (props.active ? ({ courseId: props.courseId, page: page() }) : null),
    async (key) =>
      loadListPage({
        page: key.page,
        pageSize: NOTE_PAGE_SIZE,
        clientMode: false,
        fetch: (params) => getCourseNotes(key.courseId, params),
      }),
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), NOTE_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  createEffect(() => props.onCountChange(total()));

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
    <section class="min-w-0 space-y-4 rounded-xl border border-border-line bg-surface-base p-3 sm:p-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !props.createOpen}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Show when={props.canManage}>
        <SidePanel open={props.createOpen} onOpenChange={props.onCreateOpenChange} title={t("courseNotes.new")}>
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
          <Show when={total() > NOTE_PAGE_SIZE}>
            <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
          </Show>
        </Show>
      </Suspense>
    </section>
  );
}
