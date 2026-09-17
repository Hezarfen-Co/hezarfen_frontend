import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNotes } from "@/api/course-notes";
import { getCourses } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { formatApiError, type CourseNote } from "@/api/client";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconWaveform } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { courseNoteFiles } from "@/lib/note-source";
import { hasMinRole } from "@/lib/roles";

type StudioNote = CourseNote & { courseTitle: string; courseCreatorId: string };

/** Pick a lesson note, then read its AI outputs and produce its podcast —
 *  the same two panels the note reader shows, gathered on the AI hub. */
export function NoteStudioPanel() {
  const t = useT();
  const auth = useAuth();
  const [selectedId, setSelectedId] = createSignal("");
  const [notes, { refetch }] = createResource(
    () => auth.user()?.role ?? null,
    async (role) => {
      const courses = role === "student" ? await getMyCourses({ limit: 100 }) : await getCourses({ limit: 100 });
      const rows = await Promise.all(
        courses.items.map(async (course) => {
          try {
            const page = await getCourseNotes(course.id, { limit: 100 });
            return page.items.map<StudioNote>((note) => ({
              ...note,
              courseTitle: course.title,
              courseCreatorId: course.creator.id,
            }));
          } catch {
            return [];
          }
        }),
      );
      return rows.flat();
    },
  );
  const options = createMemo(() => (notes() ?? []).map((note) => ({ value: note.id, label: `${note.courseTitle} · ${note.title}` })));
  const selected = createMemo(() => (notes() ?? []).find((note) => note.id === selectedId()) ?? null);
  const canManageSelected = () => {
    const note = selected();
    const user = auth.user();
    return !!note && !!user && (hasMinRole(user.role, "manager") || note.courseCreatorId === user.id);
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={notes.error}>
        <ErrorAlert message={formatApiError(notes.error)} onRetry={() => void refetch()} />
      </Show>
      <Show when={!notes.error && notes()}>
        <Show
          when={(notes()?.length ?? 0) > 0}
          fallback={<EmptyState kind="notes" title={t("podcast.noNotes")} description={t("podcast.noNotesHint")} />}
        >
          <div class="mx-auto max-w-3xl space-y-4">
            <section class="data-shell space-y-2 p-4">
              <Label for="sound-studio-note">{t("podcast.source")}</Label>
              <SearchableSelect
                id="sound-studio-note"
                value={selectedId()}
                onChange={setSelectedId}
                options={options()}
                placeholder={t("podcast.selectNote")}
              />
            </section>
            <Show
              when={selected()}
              fallback={
                <section class="flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-8 text-center">
                  <div class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconWaveform class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="font-medium text-text-strong">{t("podcast.selectPrompt")}</p>
                    <p class="mt-1 text-sm text-muted-foreground">{t("podcast.selectPromptHint")}</p>
                  </div>
                </section>
              }
            >
              {(note) => (
                <div class="space-y-4">
                  <RagOutputsPanel
                    noteId={note().id}
                    source={courseNoteFiles}
                    canManage={canManageSelected()}
                    active
                  />
                  <PodcastPanel noteId={note().id} active />
                </div>
              )}
            </Show>
          </div>
        </Show>
      </Show>
    </Suspense>
  );
}
