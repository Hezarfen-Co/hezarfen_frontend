import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNotes } from "@/api/course-notes";
import { getCourses } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { formatApiError, type CourseNote } from "@/api/client";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { StudioOutputLibrary } from "@/components/ai/studio-output-library";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconSparkles, IconWaveform } from "@/components/ui/icons";
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
  let outputsSection: HTMLElement | undefined;
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
  const selectLibraryNote = (noteId: string) => {
    setSelectedId(noteId);
    requestAnimationFrame(() => outputsSection?.scrollIntoView({ behavior: "smooth", block: "start" }));
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
          <div class="w-full space-y-5">
            <section class="overflow-hidden rounded-2xl border border-border-line bg-surface-base shadow-xs">
              <div class="flex items-start gap-3 border-b border-border-line bg-primary/[0.035] px-4 py-4 sm:px-5">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
                  <IconSparkles class="h-5 w-5" />
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-medium uppercase tracking-[0.12em] text-primary-text">{t("aiHub.tab.studio")}</p>
                  <h1 class="mt-1 text-lg font-semibold tracking-tight text-text-strong">{t("aiHub.tab.studio")}</h1>
                  <p class="mt-1 max-w-2xl text-sm text-muted-foreground">{t("aiHub.description")}</p>
                </div>
              </div>
              <div class="space-y-2 px-4 py-4 sm:px-5">
                <Label for="sound-studio-note">{t("podcast.source")}</Label>
                <SearchableSelect
                  id="sound-studio-note"
                  class="w-full"
                  value={selectedId()}
                  onChange={setSelectedId}
                  options={options()}
                  placeholder={t("podcast.selectNote")}
                />
              </div>
            </section>
            <Show
              when={selected()}
              fallback={
                <section class="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] px-6 py-8 text-center">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-text">
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
                <section ref={outputsSection} class="scroll-mt-20 space-y-3 rounded-2xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4">
                  <div class="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div class="min-w-0">
                      <p class="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("aiStudio.outputs.title")}</p>
                      <h2 class="mt-1 truncate text-base font-semibold text-text-strong">{note().title}</h2>
                      <p class="mt-1 text-xs text-muted-foreground">{t("aiStudio.outputs.description")}</p>
                    </div>
                    <span class="rounded-full border border-border-line bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      {note().courseTitle}
                    </span>
                  </div>
                  <div class="grid gap-4 xl:grid-cols-2">
                    <RagOutputsPanel
                      noteId={note().id}
                      source={courseNoteFiles}
                      canManage={canManageSelected()}
                      active
                      noteTitle={note().title}
                    />
                    <PodcastPanel noteId={note().id} noteTitle={note().title} active />
                  </div>
                </section>
              )}
            </Show>
            <StudioOutputLibrary
              notes={(notes() ?? []).map((note) => ({ id: note.id, title: note.title, courseTitle: note.courseTitle }))}
              selectedId={selectedId()}
              onSelect={selectLibraryNote}
            />
          </div>
        </Show>
      </Show>
    </Suspense>
  );
}
