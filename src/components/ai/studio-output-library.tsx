import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNoteRag } from "@/api/course-notes";
import { listPodcastJobs } from "@/api/podcast";
import type { PodcastJobSummary } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconSparkles, IconWaveform } from "@/components/ui/icons";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export type StudioLibraryNote = {
  id: string;
  title: string;
  courseTitle: string;
};

/**
 * One thing the studio produced. A podcast row is a real job row — it keeps the
 * whole summary so the inspector can read it without a second request — while a
 * summary row is the single stored output a note carries.
 */
type StudioArtifact = {
  key: string;
  noteId: string;
  title: string;
  courseTitle: string;
  /** Sorts the list: when the run finished, else when it started. */
  at?: number;
  job: PodcastJobSummary | null;
  pending?: boolean;
};

const LIBRARY_LIMIT = 100;
/** Client lists reveal this many rows at a time, like client DataTables. */
/** Rows per library page; the history is already in memory, so it pages. */
const LIBRARY_PAGE = 20;

export function StudioOutputLibrary(props: {
  notes: StudioLibraryNote[];
  selectedId: string;
  /** Opens the row's own page: the note, with the episode picked for a podcast row. */
  onSelect: (noteId: string, episodeId?: string) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const source = createMemo(() => props.notes.map((note) => note.id).join(","));
  const [summaries, setSummaries] = createSignal<Record<string, number | null>>({});
  const requested = new Set<string>();
  let list: HTMLUListElement | undefined;
  let observer: IntersectionObserver | undefined;

  const loadSummary = (noteId: string) => {
    if (requested.has(noteId)) return;
    requested.add(noteId);
    void getCourseNoteRag(noteId, { limit: 1 }).then(
      (page) => setSummaries((current) => ({ ...current, [noteId]: page.items[0]?.generated_at ?? null })),
      () => setSummaries((current) => ({ ...current, [noteId]: null })),
    );
  };
  const watchNote = (element: HTMLLIElement, noteId: string) => {
    element.dataset.noteId = noteId;
    if (observer) observer.observe(element);
    else if (typeof IntersectionObserver === "undefined") loadSummary(noteId);
  };
  onMount(() => {
    if (typeof IntersectionObserver === "undefined") return;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const noteId = (entry.target as HTMLElement).dataset.noteId;
        if (noteId) loadSummary(noteId);
        observer?.unobserve(entry.target);
      }
    }, { rootMargin: "100px" });
    list?.querySelectorAll<HTMLLIElement>("[data-studio-note]").forEach((element) => observer?.observe(element));
  });
  onCleanup(() => observer?.disconnect());

  const stateVariant = (state: string) => {
    if (state === "done") return "success" as const;
    if (state === "failed") return "destructive" as const;
    if (state === "cancelled") return "secondary" as const;
    return "warning" as const;
  };
  const stateLabel = (state: string) => {
    if (state === "done") return t("podcast.history.state.done");
    if (state === "failed") return t("podcast.history.state.failed");
    if (state === "cancelled") return t("podcast.history.state.cancelled");
    return t("podcast.history.state.pending");
  };
  const formatLabel = (format: string | null) => {
    if (!format) return "";
    if (format === "duz_okuma") return t("podcast.format.duz_okuma");
    if (format === "tek_ogretici") return t("podcast.format.tek_ogretici");
    if (format === "ogrenci_hoca") return t("podcast.format.ogrenci_hoca");
    return format;
  };
  const dotClass = (state: string) => {
    if (state === "done") return "bg-success";
    if (state === "failed") return "bg-destructive";
    if (state === "cancelled") return "bg-muted-foreground/50";
    return "bg-warning";
  };

  const [podcasts] = createResource(source, () => listPodcastJobs({ limit: LIBRARY_LIMIT }));
  const items = createMemo((): StudioArtifact[] => {
    const byId = new Map(props.notes.map((note) => [note.id, note]));
    const rows: StudioArtifact[] = [];

    // Every job, not only the finished ones: a failed or cancelled run is part
    // of the history and saying so is more useful than hiding it.
    if (podcasts()) {
      for (const job of podcasts()!.items) {
        const note = byId.get(job.source_id);
        rows.push({
          key: `podcast:${job.job_id}`,
          noteId: job.source_id,
          title: note?.title ?? job.source_title ?? job.source_id,
          courseTitle: note?.courseTitle ?? "",
          at: job.finished_at ?? job.created_at,
          job,
        });
      }
    }

    props.notes.forEach((note) => {
      const at = summaries()[note.id];
      if (at === null) return;
      rows.push({
        key: `summary:${note.id}`,
        noteId: note.id,
        title: note.title,
        courseTitle: note.courseTitle,
        at,
        job: null,
        pending: at === undefined,
      });
    });

    return rows.sort((a, b) => (b.at ?? -1) - (a.at ?? -1));
  });

  // The history is merged here from two sources and held in memory, so it
  // pages with numbers — the app's standard for lists that are not fetched as
  // you scroll. A new source goes back to the first page.
  const [page, setPage] = createSignal(0);
  const total = () => items()?.length ?? 0;
  const pageCount = () => Math.max(1, Math.ceil(total() / LIBRARY_PAGE));
  const pageItems = createMemo(() => (items() ?? []).slice(page() * LIBRARY_PAGE, (page() + 1) * LIBRARY_PAGE));
  createEffect(() => {
    source();
    setPage(0);
  });
  createEffect(() => {
    if (page() >= pageCount()) setPage(pageCount() - 1);
  });

  const open = (item: StudioArtifact) => {
    // Every row opens a page of its own; an episode opens its note's page
    // with that episode loaded in the player.
    props.onSelect(item.noteId, item.job?.job_id);
  };

  return (
    <section class="overflow-hidden rounded-xl border border-border-line bg-surface-base">
      <header class="flex flex-wrap items-baseline justify-between gap-3 border-b border-border-hairline px-4 py-3">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-text-strong">{t("aiStudio.library.title")}</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">{t("aiStudio.library.description")}</p>
        </div>
        <Show when={items().some((item) => !item.pending)}>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
            {t("aiStudio.library.count", { count: items().filter((item) => !item.pending).length })}
          </span>
        </Show>
      </header>

        <Show
          when={items().length > 0 || podcasts.loading}
          fallback={
            <div class="px-4 py-5">
              <EmptyInline title={t("aiStudio.library.empty")} hint={t("aiStudio.library.emptyHint")} />
            </div>
          }
        >
          {/* A run history, the way a studio lists one: hairline dividers, a
              status dot, what was produced and when — no cards. */}
          <ul ref={list} class="divide-y divide-border-hairline">
            <For each={pageItems()}>
              {(item) => (
                <li data-studio-note={item.pending ? "" : undefined} ref={item.pending ? (element) => watchNote(element, item.noteId) : undefined}>
                  <button
                    type="button"
                    aria-current={props.selectedId === item.noteId ? "true" : undefined}
                    class={cn(
                      "flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left outline-hidden transition-colors hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      props.selectedId === item.noteId ? "border-l-primary bg-primary/[0.04]" : "border-l-transparent",
                    )}
                    onClick={() => open(item)}
                  >
                    <span class={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.pending ? "animate-pulse bg-muted-foreground/30" : item.job ? dotClass(item.job.state) : "bg-success")} />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-text-strong">{item.title}</span>
                      <span class="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.courseTitle}
                        {/* Phones fold the date under the title so the title keeps the row's width. */}
                        <span class="tabular-nums sm:hidden">
                          {item.courseTitle ? " · " : ""}
                          {item.at === undefined ? "—" : formatDateTime(item.at, locale())}
                        </span>
                      </span>
                    </span>
                    <span class="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <Show
                        when={item.job}
                        fallback={
                          <Badge variant="outline" class="gap-1 rounded-md font-normal">
                            <IconSparkles class="h-3 w-3" />
                            {item.pending ? "—" : t("aiStudio.library.summary")}
                          </Badge>
                        }
                      >
                        {(job) => (
                          <>
                            <Badge variant="outline" class="gap-1 rounded-md font-normal">
                              <IconWaveform class="h-3 w-3" />
                              {formatLabel(job().format) || t("podcast.title")}
                            </Badge>
                            <Show when={job().state !== "done"}>
                              <Badge variant={stateVariant(job().state)} class="rounded-md font-normal">
                                {stateLabel(job().state)}
                              </Badge>
                            </Show>
                          </>
                        )}
                      </Show>
                    </span>
                    <span class="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                      {item.at === undefined ? "—" : formatDateTime(item.at, locale())}
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
          <Show when={total() > 0}>
            <div class="border-t border-border-hairline px-4 py-3">
              <TablePagination
                pageIndex={page()}
                pageCount={pageCount()}
                pageSize={LIBRARY_PAGE}
                total={total()}
                onPageChange={setPage}
              />
            </div>
          </Show>
        </Show>

    </section>
  );
}
