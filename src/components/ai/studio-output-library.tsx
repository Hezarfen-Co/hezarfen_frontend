import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getCourseNoteRag } from "@/api/course-notes";
import { listPodcastJobs } from "@/api/podcast";
import type { PodcastJobSummary } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconSparkles, IconWaveform } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/cn";
import { createResponsivePageSize } from "@/lib/create-page-size";
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
  at: number;
  job: PodcastJobSummary | null;
};

const LIBRARY_LIMIT = 100;
const LIBRARY_PAGE_SIZE = 10;

export function StudioOutputLibrary(props: {
  notes: StudioLibraryNote[];
  selectedId: string;
  /** Opens the row's own page: the note, with the episode picked for a podcast row. */
  onSelect: (noteId: string, episodeId?: string) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const source = createMemo(() => props.notes.map((note) => note.id).join(","));

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

  const [items] = createResource(source, async (): Promise<StudioArtifact[]> => {
    const [podcastResult, ...summaryResults] = await Promise.allSettled([
      listPodcastJobs({ limit: LIBRARY_LIMIT }),
      ...props.notes.map((note) => getCourseNoteRag(note.id, { limit: 1 })),
    ]);
    const byId = new Map(props.notes.map((note) => [note.id, note]));
    const rows: StudioArtifact[] = [];

    // Every job, not only the finished ones: a failed or cancelled run is part
    // of the history and saying so is more useful than hiding it.
    if (podcastResult.status === "fulfilled") {
      for (const job of podcastResult.value.items) {
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

    props.notes.forEach((note, index) => {
      const result = summaryResults[index];
      const summary = result?.status === "fulfilled" ? result.value.items[0] : undefined;
      if (!summary) return;
      rows.push({
        key: `summary:${summary.id}`,
        noteId: note.id,
        title: note.title,
        courseTitle: note.courseTitle,
        at: summary.generated_at,
        job: null,
      });
    });

    return rows.sort((a, b) => b.at - a.at);
  });

  // The history is merged here from two sources, so it pages in memory.
  const [page, setPage] = createSignal(0);
  const pageSize = createResponsivePageSize(LIBRARY_PAGE_SIZE);
  const total = () => items()?.length ?? 0;
  const pageCount = createMemo(() => Math.max(1, Math.ceil(total() / pageSize())));
  const pageItems = createMemo(() => (items() ?? []).slice(page() * pageSize(), (page() + 1) * pageSize()));
  createEffect(() => {
    source();
    pageSize();
    setPage(0);
  });
  createEffect(() => {
    if (page() > pageCount() - 1) setPage(pageCount() - 1);
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
        <Show when={(items()?.length ?? 0) > 0}>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
            {t("aiStudio.library.count", { count: items()?.length ?? 0 })}
          </span>
        </Show>
      </header>

      <Suspense fallback={<div class="py-8"><PageSpinner /></div>}>
        <Show
          when={(items()?.length ?? 0) > 0}
          fallback={
            <div class="px-4 py-5">
              <EmptyInline title={t("aiStudio.library.empty")} hint={t("aiStudio.library.emptyHint")} />
            </div>
          }
        >
          {/* A run history, the way a studio lists one: hairline dividers, a
              status dot, what was produced and when — no cards. */}
          <ul class="divide-y divide-border-hairline">
            <For each={pageItems()}>
              {(item) => (
                <li>
                  <button
                    type="button"
                    aria-current={props.selectedId === item.noteId ? "true" : undefined}
                    class={cn(
                      "flex w-full items-center gap-3 border-l-2 px-4 py-2.5 text-left outline-hidden transition-colors hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      props.selectedId === item.noteId ? "border-l-primary bg-primary/[0.04]" : "border-l-transparent",
                    )}
                    onClick={() => open(item)}
                  >
                    <span
                      class={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.job ? dotClass(item.job.state) : "bg-success")}
                    />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-text-strong">{item.title}</span>
                      <span class="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.courseTitle}
                      </span>
                    </span>
                    <span class="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <Show
                        when={item.job}
                        fallback={
                          <Badge variant="outline" class="gap-1 rounded-md font-normal">
                            <IconSparkles class="h-3 w-3" />
                            {t("aiStudio.library.summary")}
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
                    <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(item.at, locale())}
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
          <Show when={pageCount() > 1}>
            <div class="border-t border-border-hairline p-2">
              <TablePagination
                pageIndex={page()}
                pageCount={pageCount()}
                pageSize={pageSize()}
                total={total()}
                onPageChange={setPage}
                class="border-0 bg-transparent"
              />
            </div>
          </Show>
        </Show>
      </Suspense>

    </section>
  );
}
