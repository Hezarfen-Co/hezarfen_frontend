import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNotes } from "@/api/course-notes";
import { getCourses } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { formatApiError, type CourseNote } from "@/api/client";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { StudioOutputLibrary } from "@/components/ai/studio-output-library";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconChevronLeft } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { cn } from "@/lib/cn";
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
          {/* Laid out the way a studio home reads: a plain title and one line
              saying what it makes, the source picker, the producers, then
              everything produced so far. Flat hairline cards, no banner and no
              shadow stack — the work is the content, not the chrome. */}
          <div class="w-full space-y-8">
            {/* On a phone an open note needs the screen more than the page
                title does; the picker below still says where you are. */}
            <header class={cn("space-y-1.5", selected() && "max-sm:hidden")}>
              <h1 class="text-2xl font-semibold tracking-tight text-text-strong">{t("aiHub.tab.studio")}</h1>
              <p class="text-sm text-muted-foreground">{t("aiStudio.heading")}</p>
            </header>

            <div class="max-w-xl space-y-2">
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

            <Show
              when={selected()}
              fallback={
                <div class="rounded-xl border border-dashed border-border-line px-6 py-12 text-center">
                  <p class="text-sm font-medium text-text-strong">{t("aiStudio.pickPrompt")}</p>
                  <p class="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("aiStudio.pickPromptHint")}</p>
                </div>
              }
            >
              {(note) => (
                <section ref={outputsSection} class="scroll-mt-20 space-y-4">
                  {/* The library steps aside while a note is open; this is the
                      way back to it without emptying the picker by hand. */}
                  <div class="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 shrink-0 gap-1 rounded-lg max-sm:h-10 max-sm:w-10 max-sm:px-0"
                      aria-label={t("aiStudio.backToLibrary")}
                      onClick={() => setSelectedId("")}
                    >
                      <IconChevronLeft class="h-4 w-4" />
                      <span class="hidden sm:inline">{t("aiStudio.backToLibrary")}</span>
                    </Button>
                    <div class="min-w-0 flex-1">
                      <h2 class="truncate text-base font-semibold text-text-strong">{note().title}</h2>
                      <p class="truncate text-xs text-muted-foreground">{note().courseTitle}</p>
                    </div>
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

            {/* The library is the landing view. Once a note is open the page is
                about producing for that note, so the list of everything else
                steps out of the way. */}
            <Show when={!selected()}>
              <StudioOutputLibrary
                notes={(notes() ?? []).map((note) => ({ id: note.id, title: note.title, courseTitle: note.courseTitle }))}
                selectedId={selectedId()}
                onSelect={selectLibraryNote}
              />
            </Show>
          </div>
        </Show>
      </Show>
    </Suspense>
  );
}
