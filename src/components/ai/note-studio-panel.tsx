import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { Link, useNavigate } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import { getCourseNotes } from "@/api/course-notes";
import { getCourses } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { formatApiError, type CourseNote, type Role } from "@/api/client";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { RagOutputsPanel } from "@/components/notes/rag-outputs-panel";
import { StudioOutputLibrary } from "@/components/ai/studio-output-library";
import { RecordNotFound } from "@/components/layout/record-not-found";
import { buttonVariants } from "@/components/ui/button";
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

const RAIL_KEY = "hezarfen.studio.railWidth";
const RAIL_MIN = 280;
const RAIL_MAX = 720;
const RAIL_DEFAULT = 352;

function readRailWidth(): number {
  if (typeof localStorage === "undefined") return RAIL_DEFAULT;
  const value = Number(localStorage.getItem(RAIL_KEY));
  return Number.isFinite(value) && value >= RAIL_MIN && value <= RAIL_MAX ? value : RAIL_DEFAULT;
}

type StudioNote = CourseNote & { courseTitle: string; courseCreatorId: string };

/** Every lesson note the account can produce from, with its course. */
async function loadStudioNotes(role: Role): Promise<StudioNote[]> {
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
}

function useStudioNotes() {
  const auth = useAuth();
  return createResource(() => auth.user()?.role ?? null, loadStudioNotes);
}

/**
 * The studio's landing page: what it makes, a picker to start on any note,
 * and the library of everything produced so far. Picking a note or a row
 * opens that note's own page (`/ai/studio/$noteId`); nothing opens in place.
 */
export function NoteStudioPanel() {
  const t = useT();
  const navigate = useNavigate();
  const [notes, { refetch }] = useStudioNotes();
  const options = createMemo(() => (notes() ?? []).map((note) => ({ value: note.id, label: `${note.courseTitle} · ${note.title}` })));
  const open = (noteId: string, episode?: string) => {
    if (!noteId) return;
    void navigate({ to: "/ai/studio/$noteId", params: { noteId }, search: { episode } });
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
          {/* A studio home: a plain title and one line saying what it makes,
              the way to start on a note, then everything produced so far.
              Flat hairline cards, no banner and no shadow stack. */}
          <div class="w-full space-y-8">
            <header class="space-y-1.5">
              <h1 class="text-2xl font-semibold tracking-tight text-text-strong">{t("aiHub.tab.studio")}</h1>
              <p class="text-sm text-muted-foreground">{t("aiStudio.heading")}</p>
            </header>

            <div class="max-w-xl space-y-2">
              <Label for="sound-studio-note">{t("podcast.source")}</Label>
              <SearchableSelect
                id="sound-studio-note"
                class="w-full"
                value=""
                onChange={(noteId) => open(noteId)}
                options={options()}
                placeholder={t("podcast.selectNote")}
              />
            </div>

            <StudioOutputLibrary
              notes={(notes() ?? []).map((note) => ({ id: note.id, title: note.title, courseTitle: note.courseTitle }))}
              selectedId=""
              onSelect={open}
            />
          </div>
        </Show>
      </Show>
    </Suspense>
  );
}

/**
 * One note's studio page: its summary and its episodes, nothing else — no
 * picker, no library. "Kitaplığa dön" is the way back. `episode` preselects
 * an episode opened from the library.
 */
export function NoteStudioDetail(props: { noteId: string; episode?: string }) {
  const t = useT();
  const auth = useAuth();
  const [notes, { refetch }] = useStudioNotes();
  const note = createMemo(() => (notes() ?? []).find((row) => row.id === props.noteId) ?? null);
  // The audio rail is resizable from its left edge, remembered on this device.
  const [railWidth, setRailWidth] = createSignal(readRailWidth());
  const clampRail = (value: number) => Math.round(Math.min(RAIL_MAX, Math.max(RAIL_MIN, value)));
  createEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(RAIL_KEY, String(railWidth()));
  });
  const startResize = (event: PointerEvent) => {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = railWidth();
    const move = (next: PointerEvent) => setRailWidth(clampRail(startWidth + (startX - next.clientX)));
    const stop = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };
  const canManage = () => {
    const current = note();
    const user = auth.user();
    return !!current && !!user && (hasMinRole(user.role, "manager") || current.courseCreatorId === user.id);
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={notes.error}>
        <ErrorAlert message={formatApiError(notes.error)} onRetry={() => void refetch()} />
      </Show>
      <Show when={!notes.error && notes()}>
        <Show when={note()} fallback={<RecordNotFound backTo="/ai/studio" />}>
          {(current) => (
            // Laid out like a Mistral Studio tool page (Text to Speech): a thin
            // top bar with the way back and the note's name, the work on a
            // wide canvas, and the audio controls on a rail at the right.
            <div class="flex w-full flex-col lg:-mx-10 lg:-my-6 lg:h-[calc(100dvh-49px-env(safe-area-inset-top))] lg:w-auto">
              <div class="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-hairline pb-3 lg:px-6 lg:pb-0">
                <Link
                  to="/ai/studio"
                  class={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 h-8 gap-1 rounded-lg text-muted-foreground")}
                >
                  <IconChevronLeft class="h-4 w-4" />
                  {t("aiStudio.backToLibrary")}
                </Link>
                <span class="hidden h-4 w-px bg-border-line sm:block" aria-hidden="true" />
                <h1 class="min-w-0 truncate text-sm font-semibold text-text-strong">{current().title}</h1>
                <span class="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary-text">{current().courseTitle}</span>
              </div>
              <div
                class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_var(--studio-rail)]"
                style={{ "--studio-rail": `${railWidth()}px` }}
              >
                <div class="min-w-0 py-6 lg:overflow-y-auto lg:px-8">
                  <div class="mx-auto w-full max-w-3xl">
                    <RagOutputsPanel
                      noteId={current().id}
                      source={courseNoteFiles}
                      canManage={canManage()}
                      active
                      flat
                      noteTitle={current().title}
                    />
                  </div>
                </div>
                <aside class="relative min-w-0 border-t border-border-hairline py-6 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:bg-surface-overlay/30 lg:px-5">
                  {/* Drag (or arrow keys) to widen the rail; double-click resets it. */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={t("aiStudio.resizeRail")}
                    aria-valuemin={RAIL_MIN}
                    aria-valuemax={RAIL_MAX}
                    aria-valuenow={railWidth()}
                    tabIndex={0}
                    class="group absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize touch-none outline-hidden lg:block"
                    onPointerDown={startResize}
                    onDblClick={() => setRailWidth(RAIL_DEFAULT)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") setRailWidth((w) => clampRail(w + 24));
                      else if (event.key === "ArrowRight") setRailWidth((w) => clampRail(w - 24));
                      else return;
                      event.preventDefault();
                    }}
                  >
                    <span class="block h-full w-px bg-transparent transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary group-active:bg-primary" />
                  </div>
                  <PodcastPanel noteId={current().id} noteTitle={current().title} episode={props.episode} active flat />
                </aside>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </Suspense>
  );
}
