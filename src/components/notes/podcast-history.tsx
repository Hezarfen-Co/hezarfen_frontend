import { For, Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
import { formatApiError, type PodcastJobSummary, type PodcastTranscriptSegment } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { listPodcastJobs, podcastAudioUrl } from "@/api/podcast";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { IconDownload, IconPlay, IconWaveform } from "@/components/ui/icons";
import { PodcastPlayer } from "@/components/notes/podcast-player";
import { cn } from "@/lib/cn";
import { podcastDownloadFilename, usePodcastDownloadT } from "@/components/notes/podcast-download";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const HISTORY_PAGE_SIZE = 10;

// The three narrations the service produces. It settles the format on its first
// report, so a live job often carries none yet, and a format this build has no
// label for is shown verbatim rather than dropped.
const FORMAT_KEYS: Record<string, MessageKey> = {
  duz_okuma: "podcast.format.duz_okuma",
  tek_ogretici: "podcast.format.tek_ogretici",
  ogrenci_hoca: "podcast.format.ogrenci_hoca",
};

/**
 * The note's episodes: one player on top for the selected episode, and a
 * plain list under it — narration, when, how long. A row is picked, not
 * expanded, so there is only ever one player and one set of controls.
 *
 * The newest finished episode is selected on load (not played); a generation
 * the panel just finished is selected as it lands. Unfinished rows stay in
 * the list, muted, with their state instead of a player.
 */
export function PodcastHistory(props: {
  noteId?: string;
  active?: boolean;
  refetchKey?: string | number;
  /** An episode to open with, e.g. one picked in the studio library. */
  episode?: string;
  /** The transcript of the episode the panel just produced, if the service sent one. */
  transcript?: { jobId: string; segments: PodcastTranscriptSegment[] } | null;
}) {
  const t = useT();
  const downloadT = usePodcastDownloadT();
  const { locale } = usePreferences();
  const [selected, setSelected] = createSignal("");
  const [autoplay, setAutoplay] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const pageSize = createResponsivePageSize(HISTORY_PAGE_SIZE);
  const active = () => props.active !== false;

  createEffect(() => {
    props.noteId;
    pageSize();
    setPage(0);
    setSelected(props.episode ?? "");
    setAutoplay(false);
  });

  // The source is the scope string, not a fresh object: an identity-stable
  // value keeps the resource from refetching when nothing about it changed.
  const source = createMemo(() => (active() && props.noteId ? { noteId: props.noteId, page: page(), size: pageSize() } : null));
  const [list, { refetch }] = createResource(
    source,
    (scope) => listPodcastJobs({ limit: scope.size, offset: scope.page * scope.size, sourceId: scope.noteId }),
  );

  // The panel bumps the key ("", then the job id) when a generation finishes;
  // pull a fresh page so the episode it just produced appears, and select it.
  createEffect(() => {
    const key = props.refetchKey;
    if (!key) return;
    void refetch();
    if (typeof key === "string") {
      setSelected(key);
      setAutoplay(false);
    }
  });

  const jobs = () => list()?.items ?? [];
  const totalPages = createMemo(() => Math.max(1, Math.ceil((list()?.total ?? 0) / pageSize())));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

  createEffect(() => {
    if (page() > totalPages() - 1) setPage(totalPages() - 1);
  });

  // Nothing picked yet (or the pick left the page): fall back to the newest
  // finished episode on screen.
  createEffect(() => {
    const rows = jobs();
    if (rows.some((row) => row.job_id === selected() && row.state === "done")) return;
    const first = rows.find((row) => row.state === "done");
    // A just-finished job may not be on the refetched page yet; keep it picked.
    const waitingForFresh = !!props.refetchKey && props.refetchKey === selected();
    if (first && !waitingForFresh) setSelected(first.job_id);
  });
  const current = createMemo(() => jobs().find((row) => row.job_id === selected() && row.state === "done") ?? null);

  const formatLabel = (format: string | null) => {
    if (!format) return "";
    const key = FORMAT_KEYS[format];
    return key ? t(key) : format;
  };
  const stateLabel = (state: string) => {
    if (state === "done") return t("podcast.history.state.done");
    if (state === "failed") return t("podcast.history.state.failed");
    if (state === "cancelled") return t("podcast.history.state.cancelled");
    return t("podcast.history.state.pending");
  };
  const stateVariant = (state: string) => {
    if (state === "failed") return "destructive" as const;
    if (state === "cancelled") return "secondary" as const;
    return "warning" as const;
  };
  // Scoped to one note, every row narrates the same note — its title would
  // only repeat; the narration names the episode instead.
  const rowTitle = (row: PodcastJobSummary) =>
    props.noteId ? formatLabel(row.format) || t("podcast.history.episode") : row.source_title ?? row.source_id;
  const noteName = (row: PodcastJobSummary) => row.source_title ?? row.source_id;
  const pick = (row: PodcastJobSummary) => {
    setSelected(row.job_id);
    setAutoplay(true);
  };

  return (
    <div class="space-y-3 border-t border-border-line pt-4">
      <h3 class="text-sm font-semibold">{t("podcast.history.title")}</h3>

      <Show when={list.error}>
        <Alert variant="destructive">{formatApiError(list.error)}</Alert>
      </Show>

      <Show when={!list.error}>
        <Suspense fallback={<PageSpinner />}>
          <Show
            when={jobs().length > 0}
            fallback={
              <EmptyInline
                title={props.noteId ? t("podcast.history.emptyNote") : t("podcast.history.empty")}
                hint={t("podcast.history.emptyHint")}
              />
            }
          >
            <Show when={current()} keyed>
              {(row) => (
                <PodcastPlayer
                  jobId={row.job_id}
                  title={rowTitle(row)}
                  subtitle={formatDateTime(row.created_at, locale())}
                  downloadName={noteName(row)}
                  durationSecs={row.duration_secs}
                  transcript={props.transcript?.jobId === row.job_id ? props.transcript.segments : null}
                  autoplay={autoplay()}
                />
              )}
            </Show>

            <ul class="divide-y divide-border-hairline overflow-hidden rounded-lg border border-border-hairline">
              <For each={jobs()}>
                {(row) => {
                  const isCurrent = () => current()?.job_id === row.job_id;
                  return (
                    <li class={cn("flex items-center gap-1 pr-1.5", isCurrent() && "bg-primary/5")}>
                      <Show
                        when={row.state === "done"}
                        fallback={
                          <div class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-muted-foreground" title={row.error_code ?? undefined}>
                            <span class="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
                              <span class="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                            </span>
                            <span class="min-w-0 flex-1">
                              <span class="block truncate text-sm">{rowTitle(row)}</span>
                              <span class="block truncate text-xs">{formatDateTime(row.created_at, locale())}</span>
                            </span>
                            <Badge variant={stateVariant(row.state)}>{stateLabel(row.state)}</Badge>
                          </div>
                        }
                      >
                        <button
                          type="button"
                          class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          aria-label={`${t("podcast.history.play")}: ${rowTitle(row)}, ${formatDateTime(row.created_at, locale())}`}
                          aria-current={isCurrent() ? "true" : undefined}
                          onClick={() => pick(row)}
                        >
                          <span
                            class={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              isCurrent() ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
                            )}
                            aria-hidden="true"
                          >
                            <Show when={isCurrent()} fallback={<IconPlay class="ml-px h-3 w-3" />}>
                              <IconWaveform class="h-3.5 w-3.5" />
                            </Show>
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class={cn("block truncate text-sm", isCurrent() ? "font-semibold" : "font-medium")}>{rowTitle(row)}</span>
                            <span class="block truncate text-xs text-muted-foreground">{formatDateTime(row.created_at, locale())}</span>
                          </span>
                          <Show when={row.duration_secs != null}>
                            <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
                              {formatDurationClock((row.duration_secs ?? 0) * 1000)}
                            </span>
                          </Show>
                        </button>
                        <a
                          href={podcastAudioUrl(row.job_id)}
                          download={podcastDownloadFilename(noteName(row), downloadT("podcast.download.fallback"))}
                          aria-label={downloadT("podcast.download.aria")}
                          title={downloadT("podcast.download.label")}
                          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <IconDownload class="h-4 w-4" />
                        </a>
                      </Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
          <Show when={(list()?.total ?? 0) > pageSize()}>
            <TablePagination pageIndex={safePage()} pageCount={totalPages()} onPageChange={setPage} />
          </Show>
        </Suspense>
      </Show>
    </div>
  );
}
